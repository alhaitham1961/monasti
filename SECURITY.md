# Security - منصّتي monasti

## Security Overview
منصّتي تتبع أفضل الممارسات الأمنية لضمان حماية البيانات، الأمان المالي، وسلامة المستخدمين.

## 1. Authentication & Authorization

### JWT Authentication
```javascript
// Middleware للتحقق من التوكن
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
```

### Role-Based Access Control (RBAC)
```javascript
// Middleware للتحقق من الصلاحيات
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
app.get('/admin/dashboard', authenticateToken, requireRole('admin'), adminController.dashboard);
```

### Password Security
```javascript
// تشفير كلمة المرور
const bcrypt = require('bcrypt');
const saltRounds = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Middleware لفحص قوة كلمة المرور
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar
  );
}
```

## 2. HTTP Security Headers

### Helmet Configuration
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### Security Headers Examples
```javascript
// Headers مضافة يدوياً
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

## 3. Rate Limiting

### Rate Limiting Middleware
```javascript
const rateLimit = require('express-rate-limit');

// General API Rate Limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login Rate Limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
});

// Payment Rate Limit
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment attempts per hour
  message: 'Too many payment attempts, please try again later.',
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.post('/api/auth/login', loginLimiter);
app.post('/api/payments/', paymentLimiter);
```

## 4. CORS Configuration

### CORS Middleware
```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://coachhub.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// CORS Preflight Handler
app.options('*', cors(corsOptions));
```

## 5. Input Validation & Sanitization

### Joi Validation Schemas
```javascript
const Joi = require('joi');

// User Registration Schema
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^(\+964|0)?7\d{8}$/).required(),
});

// Booking Schema
const bookingSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  traineeId: Joi.string().uuid().required(),
  paymentMethod: Joi.string().valid('zaincash', 'voucher', 'card').required(),
});

// Sanitization Middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};
```

## 6. SQL Injection Prevention

### Parameterized Queries (Prisma)
```javascript
// استخدام Prisma يحمي من SQL Injection تلقائياً
const users = await prisma.user.findMany({
  where: {
    email: {
      equals: email, // Parameterized
    },
  },
});

// استخدام Prepared Statements
const query = `
  SELECT * FROM users
  WHERE email = $1 AND role = $2
`;
const result = await pool.query(query, [email, role]);
```

## 7. XSS Prevention

### Input Validation & Output Encoding
```javascript
// استخدام DOMPurify لتنظيف HTML
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

function sanitizeHTML(html) {
  return purify.sanitize(html);
}

// استخدام escape في Express
app.use((req, res, next) => {
  res.locals.escape = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  next();
});
```

## 8. File Upload Security

### Multer Configuration
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed!'));
  }
};

// Upload Configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

// Apply upload middleware
app.post('/api/upload/avatar', upload.single('avatar'), uploadController.uploadAvatar);
```

## 9. Secure Session Management

### Session Configuration
```javascript
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000, // prune expired entries
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict',
  },
}));
```

## 10. Secure Environment Variables

### Environment Variables Validation
```javascript
// .env.example
JWT_SECRET=your_super_secret_jwt_key
SESSION_SECRET=your_super_secret_session_key
DATABASE_URL=postgresql://user:password@localhost:5432/coachhub
ALLOWED_ORIGINS=https://coachhub.com
NODE_ENV=development

// Validation Middleware
const validateEnv = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'DATABASE_URL',
    'ALLOWED_ORIGINS',
    'NODE_ENV',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
};

// Production Guard
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_jwt_key') {
    throw new Error('JWT_SECRET must be set in production!');
  }
}
```

## 11. Logging & Monitoring

### Structured Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});
```

## 12. Backup & Recovery

### Automated Backup Script
```javascript
// backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'backups');
const DATABASE_URL = process.env.DATABASE_URL;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `coachhub-backup-${timestamp}.sql`);

exec(`pg_dump ${DATABASE_URL} > ${backupFile}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error}`);
    return;
  }
  console.log(`Backup created: ${backupFile}`);
});

// Cron Job Setup
// 0 2 * * * node backup.js
```

## 13. Security Checklist for Launch

- [x] JWT authentication with strong secrets
- [x] Role-based access control (RBAC)
- [x] Helmet security headers
- [x] Rate limiting on all API endpoints
- [x] CORS properly configured
- [x] Input validation with Joi/Zod
- [x] SQL injection prevention (Prisma)
- [x] XSS prevention (DOMPurify)
- [x] File upload security (size limits, type validation)
- [x] Secure session management
- [x] Environment variables validation
- [x] Structured logging
- [x] Automated backup scripts
- [x] HTTPS enforcement
- [x] CSP headers
- [x] Security headers (X-Frame-Options, X-XSS-Protection)
- [x] Password strength requirements
- [x] Rate limiting on sensitive endpoints (login, payment)
- [x] Audit logging for sensitive actions

## 14. Security Incident Response

### Alert on Server Errors
```javascript
// Slack Integration for Error Alerts
const axios = require('axios');

async function sendSlackAlert(error) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const message = {
    text: `🚨 Server Error: ${error.message}`,
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'Error', value: error.message },
        { title: 'Stack Trace', value: error.stack },
        { title: 'URL', value: error.url || 'N/A' },
      ],
    }],
  };

  await axios.post(webhookUrl, message);
}

// Error Handler
app.use((err, req, res, next) => {
  logger.error(err);
  sendSlackAlert(err);
  res.status(500).json({ error: 'Internal server error' });
});
```