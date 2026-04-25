import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FriendshipService } from '../services/friendshipService';

export async function friendsRoutes(fastify: FastifyInstance) {
  const friendshipService = new FriendshipService();

  // POST /api/v1/friends/requests - 发送好友请求
  fastify.post(
    '/api/v1/friends/requests',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
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
                required: ['id', 'userId', 'friendId', 'status', 'createdAt'],
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  friendId: { type: 'string' },
                  status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'BLOCKED'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      nickname: { type: ['string', 'null'] },
                      avatar: { type: ['string', 'null'] },
                      isOnline: { type: 'boolean' },
                    },
                  },
                  friend: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      nickname: { type: ['string', 'null'] },
                      avatar: { type: ['string', 'null'] },
                      isOnline: { type: 'boolean' },
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
      const { userId } = request.body as { userId: string };
      const friendship = await friendshipService.sendRequest(request.user.id, userId);
      return { success: true, data: friendship };
    },
  );

  // PATCH /api/v1/friends/requests/:requestId - 处理好友请求
  fastify.patch(
    '/api/v1/friends/requests/:requestId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['action'],
          properties: {
            action: { type: 'string', enum: ['accept', 'reject', 'block'] },
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
                required: ['id', 'status'],
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'BLOCKED'] },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { requestId } = request.params as { requestId: string };
      const { action } = request.body as { action: 'accept' | 'reject' };
      const friendship = await friendshipService.handleRequest(requestId, request.user.id, action);
      return { success: true, data: { id: friendship.id, status: friendship.status } };
    },
  );

  // GET /api/v1/friends - 获取好友列表
  fastify.get(
    '/api/v1/friends',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ACCEPTED', 'PENDING', 'BLOCKED'],
              default: 'ACCEPTED',
            },
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
                  required: ['id', 'friendId', 'username', 'isOnline', 'friendship'],
                  properties: {
                    id: { type: 'string' },
                    friendId: { type: 'string' },
                    username: { type: 'string' },
                    nickname: { type: ['string', 'null'] },
                    avatar: { type: ['string', 'null'] },
                    isOnline: { type: 'boolean' },
                    lastSeenAt: { type: ['string', 'null'], format: 'date-time' },
                    friendship: {
                      type: 'object',
                      properties: {
                        createdAt: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                      },
                    },
                    isRequester: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { status = 'ACCEPTED' } = request.query as { status?: string };
      const friends = await friendshipService.getFriends(request.user.id, status);
      return { success: true, data: friends };
    },
  );

  // DELETE /api/v1/friends/:friendshipId - 删除好友关系
  fastify.delete(
    '/api/v1/friends/:friendshipId',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['success', 'message'],
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request) => {
      const { friendshipId } = request.params as { friendshipId: string };
      const deleted = await friendshipService.removeFriendship(request.user.id, friendshipId);
      if (!deleted) {
        throw fastify.httpErrors.notFound('Friendship not found');
      }
      return { success: true, message: 'Friend removed' };
    },
  );

  // GET /api/v1/friends/requests/incoming - 获取收到的好友请求
  fastify.get(
    '/api/v1/friends/requests/incoming',
    {
      schema: {
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
                  required: ['id', 'userId', 'username'],
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    username: { type: 'string' },
                    nickname: { type: ['string', 'null'] },
                    avatar: { type: ['string', 'null'] },
                    isOnline: { type: 'boolean' },
                    friendship: {
                      type: 'object',
                      properties: {
                        createdAt: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                      },
                    },
                    isRequester: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const requests = await friendshipService.getIncomingRequests(request.user.id);
      return { success: true, data: requests };
    },
  );
}
