const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        profile: true,
        wallet: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            sessions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('phone').optional().matches(/^(?:\+964|0)?7\d{8}$/),
  body('bio').optional().isLength({ max: 500 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { firstName, lastName, phone, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(bio && { bio })
      },
      include: {
        profile: true,
        wallet: true
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update coach profile
router.put('/profile/coach', authenticateToken, [
  body('title').optional().isLength({ max: 100 }).trim(),
  body('specialization').optional().isArray(),
  body('experience').optional().isInt({ min: 0 }),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('bio').optional().isLength({ max: 1000 }).trim(),
  body('location').optional().isLength({ max: 100 }).trim(),
  body('timezone').optional().isLength({ max: 50 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { title, specialization, experience, hourlyRate, bio, location, timezone } = req.body;

    // Check if user is a coach
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (user.role !== 'COACH') {
      return res.status(403).json({ error: 'Only coaches can update coach profile' });
    }

    // specialization is String[] in PostgreSQL - pass array directly
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: req.user.userId },
      update: {
        ...(title && { title }),
        ...(specialization && { specialization }),
        ...(experience !== undefined && { experience }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(bio && { bio }),
        ...(location && { location }),
        ...(timezone && { timezone })
      },
      create: {
        userId: req.user.userId,
        title,
        specialization: specialization || [],
        experience,
        hourlyRate,
        bio,
        location,
        timezone
      }
    });

    res.json({
      message: 'Coach profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Update coach profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user wallet
router.get('/wallet', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(wallet);

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update wallet balance (admin only — prevents self-credit exploit)
router.put('/wallet', authenticateToken, requireRole('ADMIN'), [
  body('userId').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('operation').isIn(['add', 'subtract'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, amount, operation } = req.body;
    const currentWallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!currentWallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const newBalance = operation === 'add' 
      ? currentWallet.balance + amount 
      : currentWallet.balance - amount;

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: { balance: newBalance }
    });

    // Record the transaction for audit trail
    await prisma.transaction.create({
      data: {
        walletId: currentWallet.id,
        amount,
        type: operation === 'add' ? 'CREDIT' : 'DEBIT',
        description: `Admin ${operation} by ${req.user.userId}`
      }
    });

    res.json({
      message: 'Wallet updated successfully',
      wallet: updatedWallet
    });

  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;