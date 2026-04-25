import { FastifyInstance } from 'fastify';

/**
 * 管理员权限检查中间件
 * 仅允许 ADMIN 角色访问
 */
export function adminPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticateAdmin', async (request: any, reply: any) => {
    if (request.user.role !== 'ADMIN') {
      throw fastify.httpErrors.forbidden('Admin access required');
    }
  });
}
