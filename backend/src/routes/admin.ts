import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AdminService } from '@/services/adminService';

export async function adminRoutes(fastify: FastifyInstance) {
  const adminService = new AdminService();

  // PATCH /api/v1/admin/users/:userId/ban
  fastify.patch(
    '/api/v1/admin/users/:userId/ban',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'message'],
          },
        },
      },
    },
    async (request) => {
      const { userId: targetUserId } = request.params;
      const { reason } = request.body;
      const result = await adminService.banUser(request.user.id, targetUserId, reason);
      return { success: true, message: result.message };
    }
  );

  // PATCH /api/v1/admin/users/:userId/unban
  fastify.patch(
    '/api/v1/admin/users/:userId/unban',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['success', 'message'],
          },
        },
      },
    },
    async (request) => {
      const { userId: targetUserId } = request.params;
      const result = await adminService.unbanUser(request.user.id, targetUserId);
      return { success: true, message: result.message };
    }
  );

  // DELETE /api/v1/admin/messages/:messageId
  fastify.delete(
    '/api/v1/admin/messages/:messageId',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['success', 'message'],
          },
        },
      },
    },
    async (request) => {
      const { messageId } = request.params;
      const result = await adminService.deleteMessage(request.user.id, messageId);
      return { success: true, message: result.message };
    }
  );

  // GET /api/v1/admin/stats
  fastify.get(
    '/api/v1/admin/stats',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                required: ['users', 'groups', 'totalMessages', 'onlineUsers'],
                properties: {
                  users: { type: 'integer' },
                  groups: { type: 'integer' },
                  totalMessages: { type: 'integer' },
                  onlineUsers: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const stats = await adminService.getStats();
      return { success: true, data: stats };
    }
  );
}