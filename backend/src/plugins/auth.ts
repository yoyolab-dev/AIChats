import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validateApiKeyFormat } from '@/utils/apiKey';
import type { FastifyRequestUser } from '@/types/user';

declare module 'fastify' {
  interface FastifyRequest {
    user: FastifyRequestUser;
  }
}

const prisma = new PrismaClient();

export async function authPlugin(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw fastify.httpErrors.unauthorized('Missing or invalid Authorization header');
    }

    const apiKey = authHeader.slice(7);

    // 格式校验
    if (!validateApiKeyFormat(apiKey)) {
      throw fastify.httpErrors.unauthorized('Invalid API Key format');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { apiKey },
        select: {
          id: true,
          username: true,
          role: true,
          isDeleted: true,
        },
      });

      if (!user) {
        throw fastify.httpErrors.unauthorized('Invalid API Key');
      }

      if (user.isDeleted) {
        throw fastify.httpErrors.unauthorized('Account has been deactivated');
      }

      // 绑定到 request
      request.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      // 更新在线状态心跳（可选，暂时注释）
      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: { isOnline: true, lastSeenAt: null },
      // });
    } catch (error) {
      if (error instanceof ZodError) {
        throw fastify.httpErrors.badRequest('Invalid request body');
      }
      throw error;
    }
  });
}