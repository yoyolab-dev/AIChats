import { PrismaClient } from '@prisma/client';
import { app } from '../src/server.js';

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) {
  throw new Error('TEST_DATABASE_URL environment variable must be set for running tests');
}
export const prisma = new PrismaClient({ datasourceUrl: dbUrl });

let server; // Fastify 'app' becomes an HTTP server after listen

beforeAll(async () => {
  await prisma.$connect();
  // Start listening on a random available port
  const instance = await app.listen({ port: 0, host: '127.0.0.1' });
  server = instance;
});

afterAll(async () => {
  await server.close();
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

export { server };