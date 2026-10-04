# Routes - منصّتي monasti

## Public Routes (غير مصادق)
| Path | Component | Description | Access |
|------|-----------|-------------|---------|
| `/` | HomePage | الصفحة الرئيسية | الجميع |
| `/coaches` | CoachesPage | قائمة المدربين | الجميع |
| `/coaches/:id` | CoachProfile | ملف المدرب الشخصي | الجميع |
| `/courses` | CoursesPage | قائمة الدورات المسجلة | الجميع |
| `/courses/:id` | CourseDetail | تفاصيل الدورة | الجميع |
| `/login` | LoginPage | تسجيل الدخول | غير مصادقين |
| `/register` | RegisterPage | إنشاء حساب | غير مصادقين |
| `/forgot-password` | ForgotPasswordPage | نسيت كلمة المرور | غير مصادقين |
| `/reset-password` | ResetPasswordPage | إعادة تعيين كلمة المرور | غير مصادقين |
| `/about` | AboutPage | من نحن | الجميع |
| `/contact` | ContactPage | اتصل بنا | الجميع |
| `/terms` | TermsPage | الشروط والأحكام | الجميع |
| `/privacy` | PrivacyPage | سياسة الخصوصية | الجميع |

## Trainee Routes (المتدربون)
| Path | Component | Description | Access |
|------|-----------|-------------|---------|
| `/dashboard` | TraineeDashboard | لوحة المتدرب | متدربين فقط |
| `/profile` | TraineeProfile | تعديل الملف الشخصي | متدربين فقط |
| `/bookings` | BookingsPage | حجوزاتي | متدربين فقط |
| `/bookings/:id` | BookingDetail | تفاصيل الحجز | متدربين فقط |
| `/sessions` | SessionsPage | جلساتي | متدربين فقط |
| `/sessions/upcoming` | UpcomingSessions | الجلسات القادمة | متدربين فقط |
| `/sessions/completed` | CompletedSessions | الجلسات المنتهية | متدربين فقط |
| `/wallet` | WalletPage | محفظتي | متدربين فقط |
| `/wallet/transactions` | WalletTransactions | معاملات المحفظة | متدربين فقط |
| `/reviews` | ReviewsPage | تقييماتي | متدربين فقط |
| `/certificates` | CertificatesPage | شهاداتي | متدربين فقط |
| `/settings` | SettingsPage | الإعدادات | متدربين فقط |
| `/support` | SupportPage | الدعم الفني | متدربين فقط |
| `/support/:id` | SupportChat | محادثة دعم | متدربين فقط |

## Coach Routes (المدربون)
| Path | Component | Description | Access |
|------|-----------|-------------|---------|
| `/coach/dashboard` | CoachDashboard | لوحة المدرب | مدربين فقط |
| `/coach/profile` | CoachProfileEdit | تعديل الملف الشخصي | مدربين فقط |
| `/coach/sessions` | CoachSessions | إدارة الجلسات | مدربين فقط |
| `/coach/sessions/create` | CreateSession | إنشاء جلسة جديدة | مدربين فقط |
| `/coach/sessions/:id/edit` | EditSession | تعديل الجلسة | مدربين فقط |
| `/coach/availability` | AvailabilityPage | توافري | مدربين فقط |
| `/coach/bookings` | CoachBookings | حجوزاتي | مدربين فقط |
| `/coach/reviews` | CoachReviews | تقييماتي | مدربين فقط |
| `/coach/courses` | CoachCourses | دوراتي | مدربين فقط |
| `/coach/courses/create` | CreateCourse | إنشاء دورة | مدربين فقط |
| `/coach/courses/:id/edit` | EditCourse | تعديل الدورة | مدربين فقط |
| `/coach/analytics` | CoachAnalytics | التحليلات | مدربين فقط |
| `/coach/commissions` | CommissionsPage | عمولاتي | مدربين فقط |
| `/coach/disputes` | DisputesPage | النزاعات | مدربين فقط |
| `/coach/settings` | CoachSettings | الإعدادات | مدربين فقط |

## Admin Routes (الإدارة)
| Path | Component | Description | Access |
|------|-----------|-------------|---------|
| `/admin` | AdminDashboard | لوحة الإدارة | إدارة فقط |
| `/admin/users` | AdminUsers | إدارة المستخدمين | إدارة فقط |
| `/admin/coaches` | AdminCoaches | إدارة المدربين | إدارة فقط |
| `/admin/sessions` | AdminSessions | إدارة الجلسات | إدارة فقط |
| `/admin/bookings` | AdminBookings | إدارة الحجوزات | إدارة فقط |
| `/admin/payments` | AdminPayments | إدارة الدفع | إدارة فقط |
| `/admin/disputes` | AdminDisputes | إدارة النزاعات | إدارة فقط |
| `/admin/support` | AdminSupport | إدارة الدعم | إدارة فقط |
| `/admin/analytics` | AdminAnalytics | التحليلات الإدارية | إدارة فقط |
| `/admin/settings` | AdminSettings | الإعدادات العامة | إدارة فقط |
| `/admin/categories` | AdminCategories | إدارة الفئات | إدارة فقط |
| `/admin/locations` | AdminLocations | إدارة المناطق | إدارة فقط |

## API Routes (REST API)
### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | تسجيل جديد |
| POST | `/api/auth/login` | تسجيل دخول |
| POST | `/api/auth/logout` | تسجيل خروج |
| POST | `/api/auth/refresh` | تحديث التوكن |
| POST | `/api/auth/forgot-password` | نسيت كلمة المرور |
| POST | `/api/auth/reset-password` | إعادة تعيين كلمة المرور |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/profile` | الحصول على الملف الشخصي |
| PUT | `/api/users/profile` | تحديث الملف الشخصي |
| PUT | `/api/users/password` | تغيير كلمة المرور |
| GET | `/api/users/wallet` | الحصول على المحفظة |
| POST | `/api/users/wallet/transfer` | تحويل رصيد |

### Coaches
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/coaches` | قائمة المدربين |
| GET | `/api/coaches/:id` | تفاصيل مدرب |
| POST | `/api/coaches` | إنشاء مدرب (إدارة) |
| PUT | `/api/coaches/:id` | تحديث مدرب |
| DELETE | `/api/coaches/:id` | حذف مدرب (إدارة) |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | قائمة الجلسات |
| GET | `/api/sessions/:id` | تفاصيل جلسة |
| POST | `/api/sessions` | إنشاء جلسة (مدرب) |
| PUT | `/api/sessions/:id` | تحديث جلسة |
| DELETE | `/api/sessions/:id` | حذف جلسة |

### Bookings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bookings` | قائمة الحجوزات |
| GET | `/api/bookings/:id` | تفاصيل حجز |
| POST | `/api/bookings` | إنشاء حجز |
| PUT | `/api/bookings/:id` | تحديث حجز |
| POST | `/api/bookings/:id/cancel` | إلغاء حجز |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/zaincash` | دفع عبر ZainCash |
| POST | `/api/payments/voucher` | استخدام كود شحن |
| POST | `/api/payments/verify` | التحقق من الدفع |
| GET | `/api/payments/history` | سجل الدفعات |

### Courses
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courses` | قائمة الدورات |
| GET | `/api/courses/:id` | تفاصيل دورة |
| POST | `/api/courses` | إنشاء دورة (مدرب) |
| PUT | `/api/courses/:id` | تحديث دورة |
| DELETE | `/api/courses/:id` | حذف دورة |

### Reviews
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reviews` | قائمة التقييمات |
| POST | `/api/reviews` | إنشاء تقييم |
| PUT | `/api/reviews/:id` | تحديث تقييم |
| DELETE | `/api/reviews/:id` | حذف تقييم |

### Support
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/support/chats` | ق المحادثات |
| POST | `/api/support/chats` | إنشاء محادثة |
| GET | `/api/support/chats/:id/messages` | رسائل محادثة |
| POST | `/api/support/chats/:id/messages` | إرسال رسالة |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/analytics` | التحليلات الإدارية |
| GET | `/api/admin/users` | إدارة المستخدمين |
| GET | `/api/admin/sessions` | إدارة الجلسات |
| GET | `/api/admin/bookings` | إدارة الحجوزات |
| GET | `/api/admin/disputes` | إدارة النزاعات |

## WebSocket Events (للدعم الفني)
| Event | Description |
|-------|-------------|
| `support:join` | الانضمام لغرفة الدعم |
| `support:message` | إرسال رسالة |
| `support:typing` | بدء الكتابة |
| `support:leave` | مغادرة الغرفة |

## Error Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/404` | NotFoundPage | صفحة غير موجودة |
| `/500` | ErrorPage | خطأ داخلي |
| `/403` | ForbiddenPage | وصول ممنوع |

## Protected Routes Middleware
```javascript
// Middleware لحماية المسارات
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).render('forbidden');
    }
    next();
  };
};

// Usage
app.get('/dashboard', requireAuth, requireRole(['trainee', 'coach', 'admin']), dashboardController);
```

## Route Guards
```javascript
// حماية المسارات حسب الحالة
const protectBookingRoutes = (req, res, next) => {
  if (req.user.role === 'coach' && req.session.bookingStatus !== 'confirmed') {
    return res.redirect('/coach/bookings');
  }
  next();
};
```

## Dynamic Routes
```javascript
// مسارات ديناميكية للملفات الشخصية
app.get('/profile/:username', async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).render('not-found');
  }
  res.render('profile', { user });
});
```

## API Versioning
```javascript
// إصدارات API
const apiV1 = express.Router();
const apiV2 = express.Router();

// Routes for v1
apiV1.get('/users', userController.getUsers);
apiV1.post('/users', userController.createUser);

// Routes for v2
apiV2.get('/users', userControllerV2.getUsers);
apiV2.post('/users', userControllerV2.createUser);

app.use('/api/v1', apiV1);
app.use('/api/v2', apiV2);
```