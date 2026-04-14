import { beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

let prisma;

beforeAll(async () => {
  prisma = new PrismaClient();
});

afterAll(async () => {
  await prisma.$disconnect();
});

globalThis.prisma = prisma;