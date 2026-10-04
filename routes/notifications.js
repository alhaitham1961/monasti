const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ADMIN-ONLY ROUTES
// ============================================================

// Get all notifications (admin only)
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
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
      prisma.notification.count({ where })
    ]);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications for a specific user (admin only)
router.get('/user/:userId', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.params.userId };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
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
      prisma.notification.count({ where })
    ]);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notification (admin or system only)
router.post('/', requireRole('ADMIN'), [
  body('userId').notEmpty(),
  body('title').isLength({ min: 1, max: 100 }).trim(),
  body('message').isLength({ min: 1, max: 500 }).trim(),
  body('type').isIn(['INFO', 'WARNING', 'SUCCESS', 'ERROR'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, title, message, type } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// AUTHENTICATED USER ROUTES (own notifications only)
// ============================================================

// Get my notifications
router.get('/my', async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.userId };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification by ID (owner or admin only)
router.get('/:id', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // SECURITY: only owner or admin can view
    if (notification.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(notification);

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read (owner or admin only)
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // SECURITY: only owner or admin can mark as read
    if (notification.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification (owner or admin only)
router.delete('/:id', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // SECURITY: only owner or admin can delete
    if (notification.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.notification.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
