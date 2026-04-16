import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'],
});

/**
 * Fastify plugin to expose Prisma client via request.prisma and fastify.prisma.
 */
export async function prismaPlugin(fastify, options) {
  fastify.log.info('prismaPlugin registering');
  fastify.decorate('prisma', prisma);
  fastify.addHook('onRequest', async (request, reply) => {
    request.prisma = prisma;
  });
  fastify.addHook('onClose', async (instance) => {
    await prisma.$disconnect();
  });
}

export { prisma };