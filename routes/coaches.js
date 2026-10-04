const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');

const router = express.Router();

// Get all coaches with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      specialization,
      minRating,
      maxPrice,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      role: 'COACH',
      isActive: true,
      profile: {
        isNot: null
      }
    };

    if (search) {
      where.OR = [
        {
          profile: {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { bio: { contains: search, mode: 'insensitive' } },
              { specialization: { has: search } }
            ]
          }
        },
        {
          firstName: { contains: search, mode: 'insensitive' }
        },
        {
          lastName: { contains: search, mode: 'insensitive' }
        }
      ];
    }

    if (specialization) {
      where.profile = {
        ...where.profile,
        specialization: { has: specialization }
      };
    }

    if (minRating) {
      where.profile = {
        ...where.profile,
        rating: { gte: parseFloat(minRating) }
      };
    }

    if (maxPrice) {
      where.profile = {
        ...where.profile,
        hourlyRate: { lte: parseFloat(maxPrice) }
      };
    }

    // Build order clause
    let orderBy = {};
    if (sortBy === 'rating') {
      orderBy = { profile: { rating: sortOrder } };
    } else if (sortBy === 'price') {
      orderBy = { profile: { hourlyRate: sortOrder } };
    } else if (sortBy === 'experience') {
      orderBy = { profile: { experience: sortOrder } };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const [coaches, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          currency: true,
          profile: true,
          _count: {
            select: {
              reviews: true,
              sessions: true
            }
          }
        },
        orderBy,
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      coaches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coach by ID
router.get('/:id', async (req, res) => {
  try {
    const coach = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        currency: true,
        profile: true,
        _count: {
          select: {
            reviews: true,
            sessions: true,
            bookings: true
          }
        }
      }
    });

    if (!coach || coach.role !== 'COACH' || !coach.isActive) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    res.json(coach);

  } catch (error) {
    console.error('Get coach error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coach availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const sessions = await prisma.session.findMany({
      where: {
        coachId: req.params.id,
        status: 'SCHEDULED',
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        startTime: true,
        endTime: true,
        duration: true
      }
    });

    res.json({
      availability: sessions,
      totalSessions: sessions.length
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coach reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: req.params.id },
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.review.count({
        where: { revieweeId: req.params.id }
      })
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

// Get coach statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        _count: {
          select: {
            reviews: true,
            sessions: true,
            bookings: true
          }
        },
        profile: {
          select: {
            rating: true,
            reviewCount: true,
            experience: true
          }
        }
      }
    });

    if (!stats || stats._count.sessions === 0) {
      return res.status(404).json({ error: 'Coach not found or has no sessions' });
    }

    // Calculate average session price
    const sessions = await prisma.session.findMany({
      where: { coachId: req.params.id },
      select: { price: true }
    });

    const avgPrice = sessions.reduce((sum, session) => sum + session.price, 0) / sessions.length;

    res.json({
      totalSessions: stats._count.sessions,
      totalReviews: stats._count.reviews,
      totalBookings: stats._count.bookings,
      averageRating: stats.profile.rating,
      reviewCount: stats.profile.reviewCount,
      experience: stats.profile.experience,
      averagePrice: avgPrice
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;