const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
require('dotenv').config();
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const coachRoutes = require('./routes/coaches');
const sessionRoutes = require('./routes/sessions');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const courseRoutes = require('./routes/courses');
const reviewRoutes = require('./routes/reviews');
const supportRoutes = require('./routes/support');
const walletRoutes = require('./routes/wallets');
const voucherRoutes = require('./routes/vouchers');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const currencyRoutes = require('./routes/currency');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later'
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use('/api', apiLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
// Public routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/courses', courseRoutes);

// Protected routes
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/reviews', authenticateToken, reviewRoutes);
app.use('/api/support', authenticateToken, supportRoutes);
app.use('/api/wallets', authenticateToken, walletRoutes);
app.use('/api/vouchers', authenticateToken, voucherRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/currency', authenticateToken, currencyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 monasti server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;