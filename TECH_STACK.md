# Tech Stack - منصّتي CoachHub

## Backend
- **Runtime**: Node.js (18.x+)
- **Framework**: Express.js
- **Database**: PostgreSQL (production)
- **ORM/Query Builder**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Authorization**: Role-based access control (trainee/coach/admin)
- **Validation**: Joi/Zod
- **Security**: Helmet, rate limiting, CORS, express-validator
- **Logging**: Winston + Morgan
- **Testing**: Jest + Supertest
- **CI/CD**: GitHub Actions

## Frontend
- **Framework**: Vanilla JavaScript (no heavy framework)
- **Styling**: Tailwind CSS + CSS Modules
- **RTL**: Full support with rtlcss
- **Internationalization**: next-intl (if needed) or custom i18n
- **State Management**: Zustand (for UI state)
- **Data Fetching**: Fetch API + SWR or custom hooks
- **PWA**: Workbox (for service worker, manifest)
- **Testing**: Playwright (E2E), Jest (unit if needed)

## Infrastructure
- **Hosting**: Render (PaaS) or VPS (DigitalOcean/AWS)
- **Database**: PostgreSQL (Supabase/Neon/Railway)
- **Cache**: Redis (optional, for sessions/rate limiting)
- **File Storage**: S3-compatible (Railway Attachments, AWS S3, or MinIO)
- **Email**: SendGrid or Resend
- **Monitoring**: Sentry (errors), UptimeRobot
- **Backup**: Automated scripts (pg_dump + rsync)

## APIs & External Services
- **Payment**: Stripe (future), ZainCash API (current)
- **Video**: WebRTC (for live sessions)
- **File Upload**: Multer + S3
- **Real-time**: Socket.io (optional, for chat/notifications)

## Development Tools
- **Code Quality**: ESLint + Prettier + Husky
- **Git**: Conventional Commits
- **Package Manager**: npm or yarn
- **Build Tools**: Vite (for frontend build)
- **Deployment**: GitHub Actions + Render/SSH

## Security & Compliance
- **HTTPS**: Automatic with Let's Encrypt
- **CSP**: Content Security Policy headers
- **Rate Limiting**: express-rate-limit
- **CORS**: Configured per environment
- **Environment Variables**: dotenv + validation
- **Input Sanitization**: express-validator
- **Audit Logging**: Winston structured logs