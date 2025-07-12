import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up test database
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up data before each test
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany();
  await prisma.operatorProfile.deleteMany();
  await prisma.user.deleteMany();
});

export { prisma };
