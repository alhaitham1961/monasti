const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all payments (admin only)
router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, bookingId } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (bookingId) {
      where.bookingId = bookingId;
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
                      id: true,
                      firstName: true,
                      lastName: true,
                      currency: true
                    }
                  }
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
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment for booking
router.post('/', [
  body('bookingId').notEmpty(),
  body('method').isIn(['ZAINCASH', 'VOUCHER', 'CARD', 'BANK_TRANSFER', 'FASTPAY', 'KICARD', 'STC_PAY', 'NAPAY', 'TAMARA', 'Tabby', 'CIB', 'ENAS']),
  body('amount').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { bookingId, method, amount } = req.body;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true,
        trainee: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.traineeId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Booking is not pending for payment' });
    }

    // Check payment amount matches booking amount
    if (parseInt(amount) !== booking.amount) {
      return res.status(400).json({ error: 'Payment amount does not match booking amount' });
    }

    // Process payment based on method
    let paymentStatus = 'PENDING';
    let externalId = null;
    let metadata = {};

    switch (method) {
      case 'ZAINCASH':
        // Manual ZainCash payment - trainee transfers to platform wallet
        // Platform wallet: 9647802851933
        // Admin verifies receipt manually
        externalId = `ZC_${Date.now()}`;
        paymentStatus = 'PENDING'; // Requires manual verification by admin
        metadata = JSON.stringify({
          gateway: 'ZainCash',
          walletNumber: '9647802851933',
          currency: 'IQD',
          type: 'manual',
          instructions: 'قم بتحويل المبلغ إلى محفظة ZainCash رقم 9647802851933 ثم أرسل إثبات الدفع'
        });
        break;

      case 'VOUCHER':
        // Check voucher code
        const voucher = await prisma.voucher.findFirst({
          where: {
            code: amount.toString(),
            isUsed: false
          }
        });

        if (!voucher) {
          return res.status(400).json({ error: 'Invalid or used voucher code' });
        }

        // Mark voucher as used
        await prisma.voucher.update({
          where: { id: voucher.id },
          data: {
            isUsed: true,
            usedBy: req.user.userId,
            usedAt: new Date()
          }
        });

        externalId = `VOUCHER_${voucher.id}`;
        paymentStatus = 'COMPLETED';
        metadata = { voucherId: voucher.id };
        break;

      case 'CARD':
        // Simulate card payment processing
        externalId = `CARD_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        break;

      case 'FASTPAY':
        // Simulate FastPay payment processing (Iraqi payment gateway)
        externalId = `FP_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'FastPay', currency: 'IQD' };
        break;

      case 'KICARD':
        // Simulate KiCard payment processing (Iraqi prepaid card)
        externalId = `KC_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'KiCard', currency: 'IQD' };
        break;

      case 'BANK_TRANSFER':
        // Simulate bank transfer
        externalId = `BANK_${Date.now()}`;
        paymentStatus = 'PENDING'; // Requires manual verification
        break;

      // ============================================
      // ARAB PAYMENT METHODS (usable in Iraq)
      // ============================================

      case 'STC_PAY':
        // STC Pay (Saudi Arabia) - works via international cards
        externalId = `STC_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'STC Pay', country: 'SA', currency: 'USD' };
        break;

      case 'NAPAY':
        // NAPAY (UAE) - works via international cards
        externalId = `NAP_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'NAPAY', country: 'AE', currency: 'USD' };
        break;

      case 'TAMARA':
        // Tamara (Saudi Arabia) - Buy Now Pay Later
        externalId = `TAM_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Tamara', country: 'SA', currency: 'USD', type: 'BNPL' };
        break;

      case 'TABBY':
        // Tabby (UAE) - Buy Now Pay Later
        externalId = `TAB_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Tabby', country: 'AE', currency: 'USD', type: 'BNPL' };
        break;

      case 'CIB':
        // CIB (Egypt)
        externalId = `CIB_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'CIB', country: 'EG', currency: 'USD' };
        break;

      case 'ENAS':
        // eNPS / eNash (Egypt)
        externalId = `ENAS_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'eNash', country: 'EG', currency: 'USD' };
        break;

      case 'VODAFONE_CASH':
        // Vodafone Cash (Egypt)
        externalId = `VFC_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Vodafone Cash', country: 'EG', currency: 'USD' };
        break;

      case 'ORANGE_MONEY':
        // Orange Money (Egypt / Jordan)
        externalId = `OM_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Orange Money', country: 'EG', currency: 'USD' };
        break;

      case 'FALCON':
        // Falcon (Qatar)
        externalId = `FAL_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Falcon', country: 'QA', currency: 'USD' };
        break;

      case 'PAYMOB':
        // Paymob (Egypt / UAE / Saudi)
        externalId = `PM_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Paymob', country: 'EG', currency: 'USD' };
        break;

      case 'Fawry':
        // Fawry (Egypt)
        externalId = `FAW_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Fawry', country: 'EG', currency: 'USD' };
        break;

      case 'MADA':
        // MADA (Saudi Arabia)
        externalId = `MADA_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'MADA', country: 'SA', currency: 'USD' };
        break;

      case 'APPLE_PAY':
        // Apple Pay (international)
        externalId = `AP_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Apple Pay', currency: 'USD' };
        break;

      case 'GOOGLE_PAY':
        // Google Pay (international)
        externalId = `GP_${Date.now()}`;
        paymentStatus = 'COMPLETED';
        metadata = { gateway: 'Google Pay', currency: 'USD' };
        break;
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        method,
        status: paymentStatus,
        externalId,
        metadata
      }
    });

    // Update booking status if payment is completed
    if (paymentStatus === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' }
      });

      // Add commission to coach wallet
      const coachWallet = await prisma.wallet.findUnique({
        where: { userId: booking.session.coachId }
      });

      if (coachWallet) {
        await prisma.wallet.update({
          where: { userId: booking.session.coachId },
          data: { balance: coachWallet.balance + booking.commission }
        });
      }
    }

    res.status(201).json({
      message: 'Payment created successfully',
      payment
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify payment (admin only)
router.post('/:id/verify', authenticateToken, [
  body('status').isIn(['COMPLETED', 'FAILED', 'CANCELLED'])
], async (req, res) => {
  try {
    const { status } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        booking: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check admin permissions
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status }
    });

    // Update booking status if payment is completed
    if (status === 'COMPLETED' && payment.booking.status === 'PENDING') {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' }
      });

      // Add commission to coach wallet
      const booking = await prisma.booking.findUnique({
        where: { id: payment.bookingId },
        include: { session: true }
      });

      if (booking) {
        const coachWallet = await prisma.wallet.findUnique({
          where: { userId: booking.session.coachId }
        });

        if (coachWallet) {
          await prisma.wallet.update({
            where: { userId: booking.session.coachId },
            data: { balance: coachWallet.balance + booking.commission }
          });
        }
      }
    }

    res.json({
      message: 'Payment verified successfully',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending manual payments (admin only)
router.get('/pending', requireRole('ADMIN'), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        method: { in: ['ZAINCASH', 'BANK_TRANSFER'] }
      },
      include: {
        booking: {
          include: {
            session: {
              include: {
                coach: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            trainee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ payments });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment history for user
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: {
          booking: {
            traineeId: req.user.userId
          }
        },
        include: {
          booking: {
            include: {
              session: {
                include: {
                  coach: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      currency: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.payment.count({
        where: {
          booking: {
            traineeId: req.user.userId
          }
        }
      })
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
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;