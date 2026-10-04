const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');

const router = express.Router();

// Get all reviews
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sessionId, coachId, rating } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (coachId) {
      where.revieweeId = coachId;
    }

    if (rating) {
      where.rating = parseInt(rating);
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          reviewee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: true
            }
          },
          session: {
            select: {
              id: true,
              title: true,
              coachId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.review.count({ where })
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get review by ID
router.get('/:id', async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: true
          }
        },
        session: {
          select: {
            id: true,
            title: true,
            coachId: true
          }
        }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);

  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create review
router.post('/', [
  body('sessionId').notEmpty(),
  body('revieweeId').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { sessionId, revieweeId, rating, comment } = req.body;

    // Check if session exists and user was part of it
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        bookings: {
          where: { traineeId: req.user.userId }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user booked this session
    const booking = session.bookings[0];
    if (!booking) {
      return res.status(400).json({ error: 'You must book this session to review it' });
    }

    // Check if session is completed
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only review completed sessions' });
    }

    // Check if user already reviewed this session
    const existingReview = await prisma.review.findFirst({
      where: {
        sessionId,
        reviewerId: req.user.userId
      }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You already reviewed this session' });
    }

    // Check if reviewee is part of this session
    if (session.coachId !== revieweeId) {
      return res.status(400).json({ error: 'Invalid reviewee for this session' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        sessionId,
        reviewerId: req.user.userId,
        revieweeId,
        rating,
        comment
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: true
          }
        },
        session: {
          select: {
            id: true,
            title: true,
            coachId: true
          }
        }
      }
    });

    // Update coach rating
    const coachReviews = await prisma.review.findMany({
      where: { revieweeId }
    });

    const totalRating = coachReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / coachReviews.length;

    await prisma.profile.update({
      where: { userId: revieweeId },
      data: {
        rating: averageRating,
        reviewCount: coachReviews.length
      }
    });

    res.status(201).json({
      message: 'Review created successfully',
      review
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review
router.put('/:id', [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        reviewee: {
          select: {
            id: true,
            profile: true
          }
        }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // SECURITY: whitelist only allowed fields (prevents mass assignment)
    const { rating, comment } = req.body;
    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const updatedReview = await prisma.review.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        },
        session: {
          select: {
            id: true,
            title: true,
            coachId: true
          }
        }
      }
    });

    // Update coach rating
    const coachReviews = await prisma.review.findMany({
      where: { revieweeId: review.revieweeId }
    });

    const totalRating = coachReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / coachReviews.length;

    await prisma.profile.update({
      where: { userId: review.revieweeId },
      data: {
        rating: averageRating,
        reviewCount: coachReviews.length
      }
    });

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review
router.delete('/:id', async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        reviewee: {
          select: {
            id: true,
            profile: true
          }
        }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const revieweeId = review.revieweeId;

    await prisma.review.delete({
      where: { id: req.params.id }
    });

    // Update coach rating
    const coachReviews = await prisma.review.findMany({
      where: { revieweeId }
    });

    const totalRating = coachReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = coachReviews.length > 0 ? totalRating / coachReviews.length : 0;

    await prisma.profile.update({
      where: { userId: revieweeId },
      data: {
        rating: averageRating,
        reviewCount: coachReviews.length
      }
    });

    res.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;