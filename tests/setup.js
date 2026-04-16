import { PrismaClient } from '@prisma/client';
import { app } from '../src/server.js';

const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
export const prisma = new PrismaClient({ datasourceUrl: dbUrl });

// Export fastify instance for supertest
export const server = app;

beforeAll(async () => {
  // Ensure DB is connected and ready
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean tables between tests
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
});