# CoachHub Marketplace 🏋️

منصّة سوق المدربين والمتدربين — منصة عراقية تربط المدربين المحترفين مع المتدربين الباحثين عن تطوير مهاراتهم.

## ✨ المميزات

- **سوق المدربين**: تصفح المدربين حسب التخصص، التقييم، والسعر
- **الجلسات**: حجز جلسات تدريبية فردية أو جماعية (أونلاين أو حضوري)
- **الدورات**: دورات مسجلة بمستويات مختلفة (مبتدئ، متوسط، متقدم)
- **الدفع**: ZainCash، بطاقات، قسائم، تحويل بنكي
- **المحفظة**: محفظة رقمية للمدربين والمتدربين
- **التقييمات**: تقييم المدربين والجلسات بعد اكتمالها
- **الإحالات**: نظام إحالة مع مكافآت
- **الدعم الفني**: نظام تذاكر دعم مدمج
- **الإشعارات**: إشعارات فورية للمستخدمين

## 🛠️ التقنيات

- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: express-validator
- **Logging**: Winston + Morgan

## 📁 هيكل المشروع

```
coachhub-marketplace/
├── server.js              # نقطة الدخول الرئيسية
├── prisma/
│   ├── schema.prisma      # مخطط قاعدة البيانات
│   ├── seed.js            # بيانات تجريبية
│   └── client.js          # Prisma client singleton
├── middleware/
│   ├── auth.js            # مصادقة JWT
│   ├── errorHandler.js    # معالجة الأخطاء
│   └── validation.js      # التحقق من المدخلات
├── routes/
│   ├── auth.js            # تسجيل/دخول/تحديث التوكن
│   ├── users.js           # ملفات المستخدمين
│   ├── coaches.js         # المدربين
│   ├── sessions.js        # الجلسات
│   ├── bookings.js        # الحجوزات
│   ├── payments.js        # المدفوعات
│   ├── courses.js         # الدورات
│   ├── reviews.js         # التقييمات
│   ├── wallets.js         # المحافظ
│   ├── vouchers.js        # القسائم
│   ├── notifications.js   # الإشعارات
│   └── support.js         # الدعم الفني
└── *.md                   # التوثيق
```

## 🚀 التشغيل

### المتطلبات
- Node.js ≥ 18
- PostgreSQL ≥ 14

### الخطوات

1. **تثبيت التبعيات**
   ```bash
   npm install
   ```

2. **إعداد قاعدة البيانات**
   ```bash
   # عدّل ملف .env ببيانات اتصال PostgreSQL
   cp .env.example .env
   ```

3. **إنشاء قاعدة البيانات والجداول**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **إدخال البيانات التجريبية**
   ```bash
   npm run seed
   ```

5. **تشغيل الخادم**
   ```bash
   npm run dev
   ```

الخادم سيعمل على `http://localhost:3000`

## 🔌 نقاط النهاية الرئيسية

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل الدخول |
| GET | `/api/coaches` | قائمة المدربين |
| GET | `/api/sessions` | قائمة الجلسات |
| GET | `/api/courses` | قائمة الدورات |
| POST | `/api/bookings` | إنشاء حجز |
| POST | `/api/payments` | إنشاء دفعة |
| GET | `/health` | فحص صحة الخادم |

## 👤 الحسابات التجريبية

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| Admin | `admin@coachhub.com` | `admin123` |
| Coach | `coach1@coachhub.com` | `coach123` |
| Trainee | `trainee1@coachhub.com` | `trainee123` |

## 📄 التوثيق

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md) — نظرة عامة على المشروع
- [TECH_STACK.md](TECH_STACK.md) — التقنيات المستخدمة
- [DATA_MODEL.md](DATA_MODEL.md) — نموذج البيانات
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — نظام التصميم
- [ROUTES.md](ROUTES.md) — نقاط النهاية
- [SECURITY.md](SECURITY.md) — الأمان

## 📝 الترخيص

MIT
