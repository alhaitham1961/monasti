const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const {
  authenticateToken,
  requireOwner,
  requireAdmin,
  requirePermission,
  PERMISSIONS,
  FULL_ADMIN_PERMISSIONS
} = require('../middleware/auth');

const router = express.Router();

// ============================================================
// PERMISSION CATALOG (for UI display)
// ============================================================

// Get list of all available permissions (owner only)
router.get('/permissions/catalog', requireOwner, (req, res) => {
  res.json({
    permissions: PERMISSIONS,
    fullAdmin: FULL_ADMIN_PERMISSIONS
  });
});

// ============================================================
// ADMIN & OWNER MANAGEMENT
// ============================================================

// List all admins & their permissions (owner only)
router.get('/admins', requireOwner, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { isOwner: true }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isOwner: true,
        permissions: true,
        isActive: true,
        createdAt: true
      }
    });

    // Parse permissions for each admin
    const result = admins.map(admin => {
      let permissions = [];
      try {
        permissions = JSON.parse(admin.permissions || '[]');
      } catch (e) {
        permissions = [];
      }
      return { ...admin, permissions };
    });

    res.json({ admins: result });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant admin role to a user (owner only)
router.post('/admins/grant', requireOwner, [
  body('userId').notEmpty(),
  body('permissions').optional().isArray(),
  body('fullAccess').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, permissions = [], fullAccess = false } = req.body;

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot modify the owner
    if (targetUser.isOwner) {
      return res.status(400).json({ error: 'Cannot modify the platform owner' });
    }

    // Validate permission names
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: 'Invalid permissions',
        details: invalidPermissions
      });
    }

    // If fullAccess, grant all permissions
    const finalPermissions = fullAccess ? ['*'] : permissions;

    // Update user: set role to ADMIN and store permissions
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'ADMIN',
        permissions: JSON.stringify(finalPermissions)
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true
      }
    });

    res.json({
      message: fullAccess
        ? 'Admin granted with full access'
        : 'Admin granted with partial permissions',
      user: {
        ...updatedUser,
        permissions: finalPermissions
      }
    });

  } catch (error) {
    console.error('Grant admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin permissions (owner only)
router.put('/admins/:userId/permissions', requireOwner, [
  body('permissions').isArray(),
  body('fullAccess').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { permissions = [], fullAccess = false } = req.body;

    // Check if target user exists and is admin
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.isOwner) {
      return res.status(400).json({ error: 'Cannot modify the platform owner' });
    }

    if (targetUser.role !== 'ADMIN') {
      return res.status(400).json({ error: 'User is not an admin' });
    }

    // Validate permission names
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => p !== '*' && !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: 'Invalid permissions',
        details: invalidPermissions
      });
    }

    const finalPermissions = fullAccess ? ['*'] : permissions;

    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        permissions: JSON.stringify(finalPermissions)
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true
      }
    });

    res.json({
      message: 'Admin permissions updated successfully',
      user: {
        ...updatedUser,
        permissions: finalPermissions
      }
    });

  } catch (error) {
    console.error('Update admin permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke admin role (owner only)
router.delete('/admins/:userId', requireOwner, async (req, res) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.isOwner) {
      return res.status(400).json({ error: 'Cannot revoke the platform owner' });
    }

    if (targetUser.role !== 'ADMIN') {
      return res.status(400).json({ error: 'User is not an admin' });
    }

    // Demote to TRAINEE and clear permissions
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        role: 'TRAINEE',
        permissions: '[]'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    res.json({
      message: 'Admin role revoked successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Revoke admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// USER MANAGEMENT (admin with permission)
// ============================================================

// List all users (admin with users.view permission)
router.get('/users', requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isOwner: true,
          isActive: true,
          createdAt: true,
          profile: {
            select: {
              title: true,
              rating: true,
              isVerified: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate / deactivate a user (admin with users.manage permission)
router.patch('/users/:userId/status', requirePermission(PERMISSIONS.USERS_MANAGE), [
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot deactivate the owner
    if (targetUser.isOwner && !req.body.isActive) {
      return res.status(400).json({ error: 'Cannot deactivate the platform owner' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: req.body.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    res.json({
      message: req.body.isActive ? 'User activated' : 'User deactivated',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a user (admin with users.delete permission)
router.delete('/users/:userId', requirePermission(PERMISSIONS.USERS_DELETE), async (req, res) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.isOwner) {
      return res.status(400).json({ error: 'Cannot delete the platform owner' });
    }

    await prisma.user.delete({
      where: { id: req.params.userId }
    });

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// DASHBOARD STATS (admin with any view permission)
// ============================================================

// Get platform statistics (admin)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalCoaches,
      totalTrainees,
      totalSessions,
      totalCourses,
      totalBookings,
      totalPayments,
      totalRevenue,
      totalSupportTickets
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'COACH' } }),
      prisma.user.count({ where: { role: 'TRAINEE' } }),
      prisma.session.count(),
      prisma.course.count(),
      prisma.booking.count(),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.supportTicket.count()
    ]);

    res.json({
      stats: {
        totalUsers,
        totalCoaches,
        totalTrainees,
        totalSessions,
        totalCourses,
        totalBookings,
        totalPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalSupportTickets
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// PAYMENT VERIFICATION (admin with payments.manage permission)
// ============================================================

// List pending payments for manual verification
router.get('/payments/pending', requirePermission(PERMISSIONS.PAYMENTS_MANAGE), async (req, res) => {
  try {
    const { page = 1, limit = 20, method } = req.query;
    const skip = (page - 1) * limit;

    const where = { status: 'PENDING' };
    if (method) {
      where.method = method;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              session: {
                include: {
                  coach: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              },
              trainee: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('List pending payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify payment (admin with payments.manage permission)
router.patch('/payments/:paymentId/verify', requirePermission(PERMISSIONS.PAYMENTS_MANAGE), [
  body('status').isIn(['COMPLETED', 'FAILED', 'CANCELLED']),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { status, notes } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: {
        booking: {
          include: {
            session: true,
            trainee: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment is not in pending status' });
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.paymentId },
      data: {
        status,
        notes,
        updatedAt: new Date()
      }
    });

    // If payment is completed, update booking status and add to wallet
    if (status === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' }
      });

      // Add payment amount to trainee's wallet
      await prisma.wallet.upsert({
        where: { userId: payment.booking.traineeId },
        update: {
          balance: {
            increment: payment.amount
          }
        },
        create: {
          userId: payment.booking.traineeId,
          balance: payment.amount
        }
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          walletId: payment.booking.traineeId,
          amount: payment.amount,
          type: 'CREDIT',
          description: `تم إيداع مبلغ ${payment.amount} من حجز جلسة`
        }
      });
    }

    // Send notification to trainee
    if (payment.booking.trainee) {
      await prisma.notification.create({
        data: {
          userId: payment.booking.traineeId,
          title: status === 'COMPLETED' ? 'تم تأكيد دفعتك' : 'تم رفض دفعتك',
          message: status === 'COMPLETED' 
            ? `تم تأكيد دفعتك بنجاح بقيمة ${payment.amount} ${payment.booking.session.currency === 'IQD' ? 'د.ع' : '$'}`
            : `تم رفض دفعتك. ${notes || 'يرجى التواصل مع الدعم الفني'}`,
          type: status === 'COMPLETED' ? 'SUCCESS' : 'ERROR'
        }
      });
    }

    res.json({
      message: `Payment ${status} successfully`,
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;