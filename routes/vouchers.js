const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// USER ROUTES
// ============================================================

// Get current user's vouchers
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, isUsed } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.userId };
    if (isUsed !== undefined) {
      where.isUsed = isUsed === 'true';
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: {
          course: {
            select: {
              title: true,
              price: true,
              currency: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.voucher.count({ where })
    ]);

    res.json({
      vouchers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Use voucher
router.post('/use', authenticateToken, [
  body('voucherCode').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { voucherCode } = req.body;

    const voucher = await prisma.voucher.findFirst({
      where: {
        code: voucherCode,
        userId: req.user.userId,
        isUsed: false
      },
      include: {
        course: true
      }
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found or already used' });
    }

    // Mark voucher as used
    const updatedVoucher = await prisma.voucher.update({
      where: { id: voucher.id },
      data: { 
        isUsed: true,
        usedAt: new Date()
      }
    });

    res.json({
      message: 'Voucher used successfully',
      voucher: updatedVoucher,
      course: voucher.course
    });
  } catch (error) {
    console.error('Use voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// ADMIN-ONLY ROUTES
// ============================================================

// Get all vouchers (admin only)
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10, isUsed } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (isUsed !== undefined) {
      where.isUsed = isUsed === 'true';
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: {
          creator: {
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
      prisma.voucher.count({ where })
    ]);

    res.json({
      vouchers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get voucher by code (admin only — prevents code leak)
router.get('/code/:code', requireRole('ADMIN'), async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { code: req.params.code }
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json(voucher);

  } catch (error) {
    console.error('Get voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create voucher (admin only)
router.post('/', requireRole('ADMIN'), [
  body('code').isLength({ min: 1, max: 50 }).trim(),
  body('amount').isFloat({ min: 0 }),
  body('maxUses').optional().isInt({ min: 1 }),
  body('expiresAt').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { code, amount, maxUses, expiresAt } = req.body;

    // Check if voucher code already exists
    const existingVoucher = await prisma.voucher.findUnique({
      where: { code }
    });

    if (existingVoucher) {
      return res.status(400).json({ error: 'Voucher code already exists' });
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        amount,
        maxUses: maxUses || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: req.user.userId
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Voucher created successfully',
      voucher
    });

  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update voucher (admin only)
router.put('/:id', requireRole('ADMIN'), [
  body('amount').optional().isFloat({ min: 0 }),
  body('maxUses').optional().isInt({ min: 1 }),
  body('expiresAt').optional().isISO8601(),
  body('isUsed').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id }
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // SECURITY: whitelist only allowed fields (prevents mass assignment)
    const { amount, maxUses, expiresAt, isUsed } = req.body;
    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);
    if (isUsed !== undefined) updateData.isUsed = isUsed;

    const updatedVoucher = await prisma.voucher.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      message: 'Voucher updated successfully',
      voucher: updatedVoucher
    });

  } catch (error) {
    console.error('Update voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete voucher (admin only)
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id }
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    await prisma.voucher.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Voucher deleted successfully' });

  } catch (error) {
    console.error('Delete voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// AUTHENTICATED USER ROUTES
// ============================================================

// Redeem a voucher by code (authenticated user — validates & marks used)
router.post('/redeem', [
  body('code').isLength({ min: 1, max: 50 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { code } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { code }
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    if (voucher.isUsed) {
      return res.status(400).json({ error: 'Voucher already used' });
    }

    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Voucher has expired' });
    }

    // Mark voucher as used
    const updatedVoucher = await prisma.voucher.update({
      where: { id: voucher.id },
      data: {
        isUsed: true,
        usedBy: req.user.userId,
        usedAt: new Date()
      }
    });

    res.json({
      message: 'Voucher redeemed successfully',
      amount: voucher.amount,
      voucher: updatedVoucher
    });

  } catch (error) {
    console.error('Redeem voucher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
