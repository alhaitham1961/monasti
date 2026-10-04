const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Seed data for testing
const seedUsers = [
  {
    email: 'admin@monati.com',
    password: bcrypt.hashSync('admin123', 10),
    firstName: 'Admin',
    lastName: 'User',
    phone: '07700000000',
    role: 'ADMIN',
    isOwner: true,
    permissions: JSON.stringify(['*']),
    currency: 'IQD',
    isActive: true,
  },
  {
    email: 'coach1@monati.com',
    password: bcrypt.hashSync('coach123', 10),
    firstName: 'Ahmed',
    lastName: 'Mohammed',
    phone: '07701111111',
    role: 'COACH',
    currency: 'IQD',
    isActive: true,
  },
  {
    email: 'trainee1@monati.com',
    password: bcrypt.hashSync('trainee123', 10),
    firstName: 'Fatima',
    lastName: 'Ali',
    phone: '07702222222',
    role: 'TRAINEE',
    currency: 'IQD',
    isActive: true,
  },
];

const seedCoaches = [
  {
    title: 'مدرب تطوير الأعمال',
    specialization: JSON.stringify(['تطوير الأعمال', 'ريادة الأعمال', 'التسويق الرقمي']),
    experience: 5,
    bio: 'مدرب متخصص في تطوير الأعمال وريادة المشاريع الناشئة',
    hourlyRate: 50,
    isVerified: true,
    rating: 4.8,
    reviewCount: 15,
    coachEarnings: 45
  },
];

const seedSessions = [
  {
    title: 'استشارة تطوير أعمال',
    description: 'استشارة فردية لتطوير مشروعك التجاري وتحسين استراتيجيتك',
    duration: 60,
    price: 50000,  // 50,000 IQD
    currency: 'IQD',
    maxParticipants: 1,
    isOnline: true,
    status: 'SCHEDULED',
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
  },
  {
    title: 'ورشة التسويق الرقمي',
    description: 'تعلم أساسيات التسويق الرقمي وتطبيقها لمشروعك',
    duration: 90,
    price: 75,  // 75 USD
    currency: 'USD',
    maxParticipants: 10,
    isOnline: true,
    status: 'SCHEDULED',
    startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
  },
];

const seedVouchers = [
  {
    code: 'WELCOME100',
    amount: 100,
    currency: 'IQD',
  },
  {
    code: 'COACH50',
    amount: 50,
    currency: 'IQD',
  },
  {
    code: 'STARTUP200',
    amount: 200,
    currency: 'IQD',
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters for foreign keys)
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.session.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('Creating users...');
  const createdUsers = await prisma.user.createMany({
    data: seedUsers,
  });

  // Get created users
  const users = await prisma.user.findMany();
  const adminUser = users.find(u => u.email === 'admin@monati.com');
  const coachUser = users.find(u => u.email === 'coach1@monati.com');
  const traineeUser = users.find(u => u.email === 'trainee1@monati.com');

  // Create profiles
  console.log('Creating profiles...');
  // Create profile only for the coach
  await prisma.profile.create({
    data: {
      userId: coachUser.id,
      title: seedCoaches[0].title,
      specialization: seedCoaches[0].specialization,
      certifications: JSON.stringify(['PMP', 'MBA']),
      experience: seedCoaches[0].experience,
      bio: seedCoaches[0].bio,
      hourlyRate: seedCoaches[0].hourlyRate,
      isVerified: seedCoaches[0].isVerified,
      rating: seedCoaches[0].rating,
      reviewCount: seedCoaches[0].reviewCount,
    },
  });

  // Create wallets
  console.log('Creating wallets...');
  await prisma.wallet.createMany({
    data: [
      { userId: adminUser.id, balance: 1000, currency: 'IQD' },
      { userId: coachUser.id, balance: 500, currency: 'IQD' },
      { userId: traineeUser.id, balance: 200, currency: 'IQD' },
    ],
  });

  // Create sessions
  console.log('Creating sessions...');
  const updatedSessions = seedSessions.map(session => ({
    ...session,
    coachId: coachUser.id,
  }));
  await prisma.session.createMany({
    data: updatedSessions,
  });

  // Create vouchers
  console.log('Creating vouchers...');
  await prisma.voucher.createMany({
    data: seedVouchers,
  });

  console.log('✅ Database seeded successfully!');
  console.log('Created users:', createdUsers.count);
  console.log('Created sessions:', updatedSessions.length);
  console.log('Created vouchers:', seedVouchers.length);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });