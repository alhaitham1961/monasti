const { PrismaClient } = require('@prisma/client');

// Prisma client singleton to avoid multiple connections in development
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;