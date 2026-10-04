const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ADMIN-ONLY ROUTES
// ============================================================

// Get all support tickets (admin only)
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get support tickets for a specific user (admin only)
router.get('/user/:userId', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.params.userId };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user support tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update support ticket status (admin only)
router.patch('/:id/status', requireRole('ADMIN'), [
  body('status').isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });

    res.json({
      message: 'Support ticket status updated successfully',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Update support ticket status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// AUTHENTICATED USER ROUTES (own tickets only)
// ============================================================

// Get my support tickets
router.get('/my', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.userId };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my support tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get support ticket by ID (owner or admin only)
router.get('/:id', async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // SECURITY: only owner or admin can view
    if (ticket.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(ticket);

  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create support ticket (authenticated user)
router.post('/', [
  body('subject').isLength({ min: 3, max: 100 }).trim(),
  body('message').isLength({ min: 10, max: 2000 }).trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { subject, message, priority } = req.body;

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        userId: req.user.userId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Create initial message
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: req.user.userId,
        content: message
      }
    });

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    });

  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add message to support ticket (owner or admin only)
router.post('/:id/messages', [
  body('content').isLength({ min: 1, max: 2000 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // SECURITY: only owner or admin can add message
    if (ticket.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if ticket is closed
    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot add message to closed ticket' });
    }

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: req.params.id,
        senderId: req.user.userId,
        content: req.body.content
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id: req.params.id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.status(201).json({
      message: 'Message added successfully',
      data: message
    });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
