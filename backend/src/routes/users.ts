import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserService } from '../services/userService';
import type { Role } from '../types/user';

// Zod schemas for runtime validation
const registerSchema = z.object({
  username: z.string(),
  nickname: z.string().optional(),
});

const updateUserSchema = z.object({
  nickname: z.string().optional(),
  avatar: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  search: z.string().optional(),
});

export async function usersRoutes(fastify: FastifyInstance) {
  const userService = new UserService();

  // POST /api/v1/users/register
  fastify.post(
    '/api/v1/users/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[a-z0-9_]+$' },
            nickname: { type: 'string', maxLength: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                required: ['id', 'username', 'apiKey', 'role', 'createdAt'],
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  nickname: { type: ['string', 'null'] },
                  apiKey: { type: 'string' },
                  role: { type: 'string', enum: ['USER', 'ADMIN'] },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { username, nickname } = request.body as { username: string; nickname?: string };
      const user = await userService.register({ username, nickname });
      return { success: true, data: user };
    },
  );

  // GET /api/v1/users/me
  fastify.get(
    '/api/v1/users/me',
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
                required: ['id', 'username', 'role', 'isOnline', 'createdAt'],
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  nickname: { type: ['string', 'null'] },
                  role: { type: 'string', enum: ['USER', 'ADMIN'] },
                  avatar: { type: ['string', 'null'] },
                  isOnline: { type: 'boolean' },
                  lastSeenAt: { type: ['string', 'null'], format: 'date-time' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const user = await userService.getUserById(request.user.id);
      return { success: true, data: user };
    },
  );

  // PATCH /api/v1/users/me
  fastify.patch(
    '/api/v1/users/me',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            nickname: { type: 'string', maxLength: 100 },
            avatar: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const { nickname, avatar } = request.body as { nickname?: string; avatar?: string };
      const user = await userService.updateUser(request.user.id, { nickname, avatar });
      return { success: true, data: user };
    },
  );

  // GET /api/v1/users/search
  fastify.get(
    '/api/v1/users/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'username', 'isOnline'],
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    nickname: { type: ['string', 'null'] },
                    avatar: { type: ['string', 'null'] },
                    isOnline: { type: 'boolean' },
                    lastSeenAt: { type: ['string', 'null'], format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { q, limit = 20 } = request.query as { q: string; limit?: number };
      const users = await userService.searchUsers(q, request.user.id, limit);
      return { success: true, data: users };
    },
  );

  // GET /api/v1/admin/users
  fastify.get(
    '/api/v1/admin/users',
    {
      preHandler: async (request) => {
        if (request.user.role !== 'ADMIN') {
          throw fastify.httpErrors.forbidden('Admin access required');
        }
      },
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            search: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                required: ['users', 'pagination'],
                properties: {
                  users: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'username', 'apiKey', 'role', 'isOnline', 'createdAt'],
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        nickname: { type: ['string', 'null'] },
                        apiKey: { type: 'string' },
                        role: { type: 'string', enum: ['USER', 'ADMIN'] },
                        isOnline: { type: 'boolean' },
                        lastSeenAt: { type: ['string', 'null'], format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    required: ['page', 'limit', 'total', 'totalPages'],
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const {
        page = 1,
        limit = 20,
        role,
        search,
      } = request.query as z.infer<typeof paginationSchema>;
      const result = await userService.getAllUsers({
        page,
        limit,
        role: role as Role | undefined,
        search,
      });
      return { success: true, data: result };
    },
  );
}
