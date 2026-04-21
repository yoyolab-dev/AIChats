import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChatService } from '@/services/chatService';

export async function chatRoutes(fastify: FastifyInstance) {
  const chatService = new ChatService();

  // GET /api/v1/chat/private/:friendId
  fastify.get(
    '/api/v1/chat/private/:friendId',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            before: { type: 'string', format: 'date-time' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
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
                required: ['messages', 'hasMore', 'friend'],
                properties: {
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'senderId', 'receiverId', 'content', 'type', 'isRead', 'createdAt', 'sender'],
                      properties: {
                        id: { type: 'string' },
                        senderId: { type: 'string' },
                        receiverId: { type: 'string' },
                        content: { type: 'string' },
                        type: { type: 'string' },
                        isRead: { type: 'boolean' },
                        readAt: { type: ['string', 'null'], format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        sender: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            nickname: { type: ['string', 'null'] },
                            avatar: { type: ['string', 'null'] },
                          },
                        },
                        replyTo: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            content: { type: 'string' },
                            sender: {
                              type: 'object',
                              properties: {
                                username: { type: 'string' },
                                nickname: { type: ['string', 'null'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  hasMore: { type: 'boolean' },
                  friend: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
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
      const { friendId } = request.params as { friendId: string };
      const { before, limit = 50 } = request.query as { before?: string; limit?: number };

      const result = await chatService.getPrivateChatHistory(request.user.id, friendId, limit, before);
      return { success: true, data: result };
    }
  );

  // POST /api/v1/chat/private/send
  fastify.post(
    '/api/v1/chat/private/send',
    {
      schema: {
        body: {
          type: 'object',
          required: ['receiverId', 'content'],
          properties: {
            receiverId: { type: 'string' },
            content: { type: 'string', maxLength: 5000 },
            type: { type: 'string', enum: ['text', 'image', 'file', 'sticker'], default: 'text' },
            replyToId: { type: 'string' },
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
                required: ['id', 'senderId', 'receiverId', 'content', 'type', 'createdAt'],
                properties: {
                  id: { type: 'string' },
                  senderId: { type: 'string' },
                  receiverId: { type: 'string' },
                  content: { type: 'string' },
                  type: { type: 'string' },
                  replyToId: { type: ['string', 'null'] },
                  isRead: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      nickname: { type: ['string', 'null'] },
                      avatar: { type: ['string', 'null'] },
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
      const { receiverId, content, type = 'text', replyToId } = request.body;
      const message = await chatService.sendPrivateMessage(request.user.id, receiverId, content, type, replyToId);
      return { success: true, data: message };
    }
  );

  // PATCH /api/v1/chat/private/:friendId/read
  fastify.patch(
    '/api/v1/chat/private/:friendId/read',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            messageIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                required: ['markedCount'],
                properties: {
                  markedCount: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { friendId } = request.params as { friendId: string };
      const { messageIds } = request.body as { messageIds?: string[] };
      const count = await chatService.markAsRead(request.user.id, friendId, messageIds);
      return { success: true, data: { markedCount: count } };
    }
  );

  // GET /api/v1/chat/private/unread-count
  fastify.get(
    '/api/v1/chat/private/unread-count',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            senderId: { type: 'string' },
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
                required: ['count'],
                properties: {
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { senderId } = request.query as { senderId?: string };
      const count = await chatService.getUnreadCount(request.user.id, senderId);
      return { success: true, data: { count } };
    }
  );

  // ============================================
  // 群聊消息 (B24-B25)
  // ============================================

  // GET /api/v1/chat/group/:groupId/messages
  fastify.get(
    '/api/v1/chat/group/:groupId/messages',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            before: { type: 'string', format: 'date-time' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
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
                required: ['messages', 'hasMore'],
                properties: {
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'groupId', 'senderId', 'content', 'type', 'createdAt', 'sender'],
                      properties: {
                        id: { type: 'string' },
                        groupId: { type: 'string' },
                        senderId: { type: 'string' },
                        content: { type: 'string' },
                        type: { type: 'string' },
                        replyToId: { type: ['string', 'null'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        sender: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            nickname: { type: ['string', 'null'] },
                            avatar: { type: ['string', 'null'] },
                          },
                        },
                        replyTo: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            content: { type: 'string' },
                            sender: {
                              type: 'object',
                              properties: {
                                username: { type: 'string' },
                                nickname: { type: ['string', 'null'] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { groupId } = request.params as { groupId: string };
      const { before, limit = 50 } = request.query as { before?: string; limit?: number };
      const result = await chatService.getGroupChatHistory(groupId, limit, before);
      return { success: true, data: result };
    }
  );

  // POST /api/v1/chat/group/:groupId/send
  fastify.post(
    '/api/v1/chat/group/:groupId/send',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', maxLength: 5000 },
            type: { type: 'string', enum: ['text', 'image', 'file', 'sticker'], default: 'text' },
            replyToId: { type: 'string' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data'],
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                required: ['id', 'groupId', 'senderId', 'content', 'type', 'createdAt'],
                properties: {
                  id: { type: 'string' },
                  groupId: { type: 'string' },
                  senderId: { type: 'string' },
                  content: { type: 'string' },
                  type: { type: 'string' },
                  replyToId: { type: ['string', 'null'] },
                  createdAt: { type: 'string', format: 'date-time' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      nickname: { type: ['string', 'null'] },
                      avatar: { type: ['string', 'null'] },
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
      const { groupId } = request.params as { groupId: string };
      const { content, type = 'text', replyToId } = request.body;
      const message = await chatService.sendGroupMessage(request.user.id, groupId, content, type, replyToId);
      return { success: true, data: message };
    }
  );
}
