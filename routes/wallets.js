const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ADMIN-ONLY ROUTES
// ============================================================

// Get all wallets (admin only)
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.wallet.count()
    ]);

    res.json({
      wallets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet by user ID (admin only — prevents data leak)
router.get('/user/:userId', requireRole('ADMIN'), async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.params.userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
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

// Create wallet (admin only)
router.post('/', requireRole('ADMIN'), [
  body('userId').notEmpty(),
  body('balance').isFloat({ min: 0 }),
  body('currency').optional().isIn(['IQD', 'USD'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, balance, currency = 'IQD' } = req.body;

    // Check if wallet already exists
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet already exists for this user' });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        balance,
        currency
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

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet
    });

  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update wallet balance (admin only)
router.put('/:id', requireRole('ADMIN'), [
  body('balance').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { id: req.params.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id: req.params.id },
      data: { balance: req.body.balance },
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

    res.json({
      message: 'Wallet updated successfully',
      wallet: updatedWallet
    });

  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add funds to wallet (admin only — prevents self-credit exploit)
router.post('/:id/add', requireRole('ADMIN'), [
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().isLength({ max: 200 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, description } = req.body;

    const wallet = await prisma.wallet.findUnique({
      where: { id: req.params.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Update wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { id: req.params.id },
      data: {
        balance: wallet.balance + amount
      }
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        walletId: req.params.id,
        amount,
        type: 'CREDIT',
        description: description || 'Manual credit'
      }
    });

    res.json({
      message: 'Funds added successfully',
      wallet: updatedWallet,
      transaction
    });

  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// AUTHENTICATED USER ROUTES (own wallet only)
// ============================================================

// Get current user wallet
router.get('/my', async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      const newWallet = await prisma.wallet.create({
        data: {
          userId: req.user.userId,
          balance: 0,
          currency: 'IQD'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          transactions: []
        }
      });

      return res.json(newWallet);
    }

    res.json(wallet);

  } catch (error) {
    console.error('Get my wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Withdraw funds from own wallet (owner only)
router.post('/:id/withdraw', async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, description } = req.body;

    const wallet = await prisma.wallet.findUnique({
      where: { id: req.params.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // SECURITY: only the wallet owner can withdraw from their own wallet
    if (wallet.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if wallet has sufficient balance
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Update wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { id: req.params.id },
      data: {
        balance: wallet.balance - amount
      }
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        walletId: req.params.id,
        amount,
        type: 'DEBIT',
        description: description || 'Manual withdrawal'
      }
    });

    res.json({
      message: 'Funds withdrawn successfully',
      wallet: updatedWallet,
      transaction
    });

  } catch (error) {
    console.error('Withdraw funds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get own wallet transactions (owner only)
router.get('/:id/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const wallet = await prisma.wallet.findUnique({
      where: { id: req.params.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // SECURITY: only the wallet owner can view their transactions
    if (wallet.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { walletId: req.params.id },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.transaction.count({
        where: { walletId: req.params.id }
      })
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
