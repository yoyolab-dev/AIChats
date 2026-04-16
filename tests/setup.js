import { PrismaClient } from '@prisma/client';
import { app } from '../src/server.js';

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) {
  throw new Error('TEST_DATABASE_URL environment variable must be set for running tests');
}
export const prisma = new PrismaClient({ datasourceUrl: dbUrl });

let server = null;

beforeAll(async () => {
  await prisma.$connect();
  await app.listen({ port: 0, host: '127.0.0.1' });
  server = app.server; // underlying http.Server for supertest
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Delete in order respecting foreign key dependencies
  await prisma.auditLog.deleteMany();
  // Nullify conversation lastMessageId to avoid FK constraint when deleting messages
  await prisma.$executeRaw`UPDATE "Conversation" SET "lastMessageId" = NULL`;
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();
});

export { server };
