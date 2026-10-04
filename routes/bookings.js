const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all bookings for current user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = { traineeId: req.user.userId };

    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          session: {
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
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.booking.count({ where })
    ]);

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        session: {
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
        },
        trainee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        payment: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to current user OR coach of the session
    const isTrainee = booking.traineeId === req.user.userId;
    const isCoach = booking.session.coachId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isTrainee && !isCoach && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new booking
router.post('/', [
  body('sessionId').notEmpty(),
  body('paymentMethod').isIn(['ZAINCASH', 'VOUCHER', 'CARD', 'BANK_TRANSFER', 'FASTPAY', 'KICARD', 'STC_PAY', 'NAPAY', 'TAMARA', 'TABBY', 'CIB', 'ENAS', 'VODAFONE_CASH', 'ORANGE_MONEY', 'FALCON', 'PAYMOB', 'Fawry', 'MADA', 'APPLE_PAY', 'GOOGLE_PAY']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { sessionId, paymentMethod } = req.body;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        coach: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Session is not available for booking' });
    }

    // Check if user already booked this session
    const existingBooking = await prisma.booking.findFirst({
      where: {
        sessionId,
        traineeId: req.user.userId
      }
    });

    if (existingBooking) {
      return res.status(400).json({ error: 'You already booked this session' });
    }

    // Check if session is full
    if (session.maxParticipants) {
      const bookingCount = await prisma.booking.count({
        where: {
          sessionId,
          status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] }
        }
      });

      if (bookingCount >= session.maxParticipants) {
        return res.status(400).json({ error: 'Session is full' });
      }
    }

    // Calculate commission (10% for coach)
    const commission = session.price * 0.1;
    // Amount is the FULL price the trainee pays
    const amount = session.price;
    // Coach earnings = price - commission
    const coachEarnings = session.price - commission;

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        sessionId,
        traineeId: req.user.userId,
        status: 'PENDING',
        paymentMethod,
        amount,
        commission,
        coachEarnings
      },
      include: {
        session: {
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
        }
      }
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel booking
router.post('/:id/cancel', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        session: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.traineeId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only cancel pending bookings' });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm booking (coach/admin)
router.post('/:id/confirm', authenticateToken, [
  body('status').isIn(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'])
], async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        session: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check permissions
    const isCoach = booking.session.coachId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCoach && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;