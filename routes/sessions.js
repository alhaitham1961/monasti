const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all sessions with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      coachId,
      minPrice,
      maxPrice,
      duration,
      startDate,
      endDate,
      sortBy = 'startTime',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      status: 'SCHEDULED',
      isOnline: true
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (coachId) {
      where.coachId = coachId;
    }

    if (minPrice) {
      where.price = { gte: parseFloat(minPrice) };
    }

    if (maxPrice) {
      where.price = { lte: parseFloat(maxPrice) };
    }

    if (duration) {
      where.duration = parseInt(duration);
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Build order clause
    const orderBy = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'duration') {
      orderBy.duration = sortOrder;
    } else {
      orderBy.startTime = sortOrder;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          coach: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              currency: true,
              profile: true
            }
          },
          _count: {
            select: {
              bookings: true,
              reviews: true
            }
          }
        },
        orderBy,
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.session.count({ where })
    ]);

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // SECURITY: only include trainee details if requester is the coach or admin
    const isCoachOrAdmin = req.user && (session.coachId === req.user.userId || req.user.role === 'ADMIN');

    let bookings = [];
    if (isCoachOrAdmin) {
      bookings = await prisma.booking.findMany({
        where: { sessionId: session.id },
        include: {
          trainee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
    }

    res.json({ ...session, bookings });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new session (coach only)
router.post('/', authenticateToken, [
  body('title').isLength({ min: 3, max: 100 }).trim(),
  body('description').isLength({ min: 10, max: 1000 }).trim(),
  body('duration').isInt({ min: 15, max: 480 }),
  body('price').isFloat({ min: 0 }),
  body('currency').optional().isIn(['IQD', 'USD']),
  body('maxParticipants').optional().isInt({ min: 1 }),
  body('startTime').isISO8601(),
  body('endTime').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { title, description, duration, price, currency = 'IQD', maxParticipants, startTime, endTime } = req.body;

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    if (end - start !== duration * 60 * 1000) {
      return res.status(400).json({ error: 'Duration does not match time range' });
    }

    // Check if coach exists
    const coach = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (coach.role !== 'COACH') {
      return res.status(403).json({ error: 'Only coaches can create sessions' });
    }

    // Check for overlapping sessions
    const overlappingSession = await prisma.session.findFirst({
      where: {
        coachId: req.user.userId,
        status: 'SCHEDULED',
        OR: [
          {
            startTime: { lte: end },
            endTime: { gt: start }
          }
        ]
      }
    });

    if (overlappingSession) {
      return res.status(400).json({ error: 'Overlapping session found' });
    }

    const session = await prisma.session.create({
      data: {
        title,
        description,
        duration,
        price,
        currency,
        maxParticipants: maxParticipants || 1,
        isOnline: true,
        coachId: req.user.userId,
        startTime: start,
        endTime: end
      },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Session created successfully',
      session
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update session (coach only)
router.put('/:id', authenticateToken, [
  body('title').optional().isLength({ min: 3, max: 100 }).trim(),
  body('description').optional().isLength({ min: 10, max: 1000 }).trim(),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('price').optional().isFloat({ min: 0 }),
  body('currency').optional().isIn(['IQD', 'USD']),
  body('maxParticipants').optional().isInt({ min: 1 }),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const session = await prisma.session.findUnique({
      where: { id: req.params.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.coachId !== req.user.userId) {
      return res.status(403).json({ error: 'Only session coach can update this session' });
    }

    if (session.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Can only update scheduled sessions' });
    }

    // SECURITY: whitelist only allowed fields (prevents mass assignment)
    const { title, description, duration, price, maxParticipants, startTime, endTime, currency } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration;
    if (price !== undefined) updateData.price = price;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (currency !== undefined) updateData.currency = currency;

    // Update time if provided
    if (updateData.startTime && updateData.endTime) {
      const start = updateData.startTime;
      const end = updateData.endTime;

      if (end <= start) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      if (updateData.duration && end - start !== updateData.duration * 60 * 1000) {
        return res.status(400).json({ error: 'Duration does not match time range' });
      }
    }

    const updatedSession = await prisma.session.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currency: true,
            profile: true
          }
        }
      }
    });

    res.json({
      message: 'Session updated successfully',
      session: updatedSession
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete session (coach only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.coachId !== req.user.userId) {
      return res.status(403).json({ error: 'Only session coach can delete this session' });
    }

    if (session.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Can only delete scheduled sessions' });
    }

    await prisma.session.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;