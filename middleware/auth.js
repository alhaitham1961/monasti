const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

// ============================================================
// PERMISSION DEFINITIONS (granular permissions for partial admin)
// ============================================================
const PERMISSIONS = {
  // User management
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  USERS_DELETE: 'users.delete',

  // Coach management
  COACHES_VIEW: 'coaches.view',
  COACHES_MANAGE: 'coaches.manage',
  COACHES_VERIFY: 'coaches.verify',

  // Sessions management
  SESSIONS_VIEW: 'sessions.view',
  SESSIONS_MANAGE: 'sessions.manage',
  SESSIONS_DELETE: 'sessions.delete',

  // Courses management
  COURSES_VIEW: 'courses.view',
  COURSES_MANAGE: 'courses.manage',
  COURSES_DELETE: 'courses.delete',

  // Bookings & payments
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_MANAGE: 'bookings.manage',
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_MANAGE: 'payments.manage',
  PAYMENTS_REFUND: 'payments.refund',

  // Financial
  WALLETS_VIEW: 'wallets.view',
  WALLETS_MANAGE: 'wallets.manage',
  VOUCHERS_MANAGE: 'vouchers.manage',

  // Support
  SUPPORT_VIEW: 'support.view',
  SUPPORT_MANAGE: 'support.manage',

  // Notifications
  NOTIFICATIONS_SEND: 'notifications.send',

  // Reviews moderation
  REVIEWS_MODERATE: 'reviews.moderate',

  // Admin management (only owner)
  ADMINS_MANAGE: 'admins.manage',
  PERMISSIONS_MANAGE: 'permissions.manage',
};

// Full admin permission set (all permissions)
const FULL_ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

// ============================================================
// AUTHENTICATION
// ============================================================

// Authenticate token and load fresh user data (incl. permissions & isOwner)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load fresh user data from DB to reflect permission changes immediately
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isOwner: true,
        permissions: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Parse permissions (stored as JSON string)
    let permissions = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch (e) {
      permissions = [];
    }

    // Attach to request
    req.user = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isOwner: user.isOwner,
      permissions
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ============================================================
// AUTHORIZATION HELPERS
// ============================================================

// Check if user is the owner (full access)
const isOwner = (req) => req.user && req.user.isOwner === true;

// Check if user is admin (role ADMIN) — owner also counts as admin
const isAdmin = (req) => req.user && (req.user.role === 'ADMIN' || req.user.isOwner === true);

// Check if user has a specific permission (owner & full admin always pass)
const hasPermission = (req, permission) => {
  if (!req.user) return false;
  if (req.user.isOwner) return true;
  if (req.user.role === 'ADMIN' && req.user.permissions.includes('*')) return true;
  return req.user.permissions.includes(permission);
};

// Require a specific role (owner bypasses role checks)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Owner bypasses all role checks
    if (req.user.isOwner) {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Require the user to be the owner
const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isOwner) {
    return res.status(403).json({ error: 'Only the platform owner can perform this action' });
  }
  next();
};

// Require a specific permission (owner & full admin always pass)
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Owner bypasses all permission checks
    if (req.user.isOwner) {
      return next();
    }
    // Full admin (role ADMIN with '*' permission) bypasses
    if (req.user.role === 'ADMIN' && req.user.permissions.includes('*')) {
      return next();
    }
    // Check if user has any of the required permissions
    const hasAny = permissions.some(p => req.user.permissions.includes(p));
    if (!hasAny) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Require admin (role ADMIN or owner)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwner,
  requirePermission,
  requireAdmin,
  isOwner,
  isAdmin,
  hasPermission,
  PERMISSIONS,
  FULL_ADMIN_PERMISSIONS
};
