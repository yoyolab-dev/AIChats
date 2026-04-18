import { PrismaClient } from '@prisma/client';
import { verifyApiKey } from '../utils/apiKey.js';

const prisma = new PrismaClient();

/**
 * Fastify 认证中间件
 * 检查 Header: Authorization: Bearer <apiKey>
 * 并将 authenticated user 附加到 request.user
 */
export async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const apiKey = authHeader.slice(7).trim();

  try {
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true, username: true, nickname: true, role: true, avatar: true, apiKey: true }
    });

    if (!user) {
      return reply.code(401).send({ error: 'Invalid API key' });
    }

    // 将用户信息附加到请求对象
    request.user = user;
  } catch (error) {
    console.error('Auth error:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
}
