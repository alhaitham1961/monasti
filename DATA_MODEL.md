# Data Model - منصّتي CoachHub

## Users (المستخدمون)
```sql
-- جدول المستخدمين الأساسي
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  language VARCHAR(10) DEFAULT 'ar', -- 'ar' or 'en'
  timezone VARCHAR(50) DEFAULT 'Asia/Baghdad',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول الملفات الشخصية
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('trainee', 'coach', 'admin')),
  bio TEXT,
  specialization JSONB, -- array of specialties
  experience_years INTEGER DEFAULT 0,
  education JSONB, -- array of education records
  certifications JSONB, -- array of certifications
  hourly_rate DECIMAL(10,2), -- for coaches
  availability JSONB, -- coach availability schedule
  trust_score DECIMAL(3,1) DEFAULT 5.0, -- 0-10 scale
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول العناوين
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'home', 'work', 'other'
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100),
  street_address TEXT,
  postal_code VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Sessions (الجلسات)
```sql
-- جدول الجلسات
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'fitness', 'programming', 'language', etc.
  type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'group')),
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IQD',
  max_participants INTEGER DEFAULT 1, -- for group sessions
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  scheduled_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  meeting_url VARCHAR(500), -- for online sessions
  recording_url VARCHAR(500), -- for session recording
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول حجوزات الجلسات
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50), -- 'zaincash', 'voucher', 'card'
  payment_reference VARCHAR(100), -- transaction ID
  escrow_held BOOLEAN DEFAULT FALSE,
  escrow_released BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول التقييمات
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_coach_review BOOLEAN DEFAULT FALSE, -- true if coach reviewing trainee
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Payments (الدفع)
```sql
-- جدول المحفظة
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'IQD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول معاملات المحفظة
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- links to booking, payment, etc.
  reference_type VARCHAR(50), -- 'booking', 'payment', 'refund', 'voucher'
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول كروت الشحن
CREATE TABLE voucher_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IQD',
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول عمولات
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL, -- percentage
  commission_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'reversed')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Courses & Content (الدورات والمحتوى)
```sql
-- جدول الدورات
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IQD',
  duration_minutes INTEGER, -- total course duration
  video_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول محتوى الدورة
CREATE TABLE course_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('video', 'document', 'quiz')),
  content_url VARCHAR(500),
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول شهادات الإتمام
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP DEFAULT NOW(),
  certificate_url VARCHAR(500),
  UNIQUE(user_id, course_id)
);
```

## Disputes & Support (النزاعات والدعم)
```sql
-- جدول النزاعات
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول المحادثات الداعمة
CREATE TABLE support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(id),
  subject VARCHAR(200),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- جدول رسائل الدعم
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES support_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Analytics & Reports (التحليلات والتقارير)
```sql
-- جدول الإحصائيات
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  metric_type VARCHAR(50) NOT NULL, -- 'session_booked', 'revenue', 'new_user', etc.
  metric_value DECIMAL(15,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول السجلات
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON profiles(role);
CREATE INDEX idx_sessions_coach ON sessions(coach_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_bookings_trainee ON bookings(trainee_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_voucher_cards_code ON voucher_cards(code);
CREATE INDEX idx_voucher_cards_used ON voucher_cards(is_used);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_analytics_date ON analytics(date);
CREATE INDEX idx_analytics_type ON analytics(metric_type);
```