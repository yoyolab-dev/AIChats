import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GroupService } from '../services/groupService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function groupsRoutes(fastify: FastifyInstance) {
  const groupService = new GroupService();

  // POST /api/v1/groups - 创建群组
  fastify.post(
    '/api/v1/groups',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', maxLength: 100 },
            description: { type: 'string' },
            isPublic: { type: 'boolean', default: false },
            initialMemberIds: {
              type: 'array',
              items: { type: 'string' },
            },
            avatar: { type: 'string' },
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
                required: ['group', 'members'],
                properties: {
                  group: {
                    type: 'object',
                    required: [
                      'id',
                      'name',
                      'ownerId',
                      'isPublic',
                      'inviteCode',
                      'maxMembers',
                      'createdAt',
                    ],
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: ['string', 'null'] },
                      ownerId: { type: 'string' },
                      avatar: { type: ['string', 'null'] },
                      isPublic: { type: 'boolean' },
                      inviteCode: { type: ['string', 'null'] },
                      maxMembers: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                  members: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        username: { type: 'string' },
                        nickname: { type: ['string', 'null'] },
                        avatar: { type: ['string', 'null'] },
                        role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                        joinedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        name,
        description,
        isPublic = false,
        initialMemberIds = [],
        avatar,
      } = request.body as {
        name: string;
        description?: string;
        isPublic?: boolean;
        initialMemberIds?: string[];
        avatar?: string;
      };
      const group = await groupService.createGroup(request.user.id, {
        name,
        description,
        isPublic,
        initialMemberIds,
        avatar,
      });
      return { success: true, data: group };
    },
  );

  // GET /api/v1/groups - 获取群组列表
  fastify.get(
    '/api/v1/groups',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['joined', 'public'] },
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
                  required: ['id', 'name', 'owner', 'myRole', 'memberCount'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    avatar: { type: ['string', 'null'] },
                    owner: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        nickname: { type: ['string', 'null'] },
                      },
                    },
                    memberCount: { type: 'integer' },
                    myRole: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                    isPublic: { type: 'boolean' },
                    inviteCode: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { type } = request.query as { type?: string };

      if (type === 'public') {
        const groups = await groupService.getPublicGroups();
        return { success: true, data: groups };
      }

      // default: joined
      const groups = await groupService.getMyGroups(request.user.id);
      return { success: true, data: groups };
    },
  );

  // GET /api/v1/groups/:groupId - 获取群组详情
  fastify.get(
    '/api/v1/groups/:groupId',
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
                required: ['group', 'members'],
                properties: {
                  group: {
                    type: 'object',
                    required: ['id', 'name', 'owner', 'inviteCode', 'isPublic'],
                  },
                  members: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        username: { type: 'string' },
                        nickname: { type: ['string', 'null'] },
                        avatar: { type: ['string', 'null'] },
                        role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                        joinedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { groupId } = request.params as { groupId: string };
      const group = await groupService.getGroupById(groupId, request.user.id);
      return { success: true, data: group };
    },
  );

  // POST /api/v1/groups/:groupId/invite - 邀请成员
  fastify.post(
    '/api/v1/groups/:groupId/invite',
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
            required: ['success', 'message'],
          },
        },
      },
    },
    async (request, reply) => {
      const { groupId } = request.params as { groupId: string };
      const { userId } = request.body as { userId: string };
      await groupService.inviteMember(groupId, request.user.id, userId);
      return { success: true, message: 'Invitation sent' };
    },
  );

  // POST /api/v1/groups/join - 使用邀请码加入
  fastify.post(
    '/api/v1/groups/join',
    {
      schema: {
        body: {
          type: 'object',
          required: ['inviteCode'],
          properties: {
            inviteCode: { type: 'string' },
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
                required: ['groupId', 'groupName', 'role'],
                properties: {
                  groupId: { type: 'string' },
                  groupName: { type: 'string' },
                  role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { inviteCode } = request.body as { inviteCode: string };
      const result = await groupService.joinWithInviteCode(request.user.id, inviteCode);
      return { success: true, data: result };
    },
  );

  // PATCH /api/v1/groups/:groupId/members/:userId - 修改成员权限
  fastify.patch(
    '/api/v1/groups/:groupId/members/:userId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['action'],
          properties: {
            action: { type: 'string', enum: ['promote', 'demote', 'kick'] },
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
    async (request, reply) => {
      const { groupId, userId: targetUserId } = request.params as {
        groupId: string;
        userId: string;
      };
      const { action } = request.body as { action: 'kick' | 'promote' | 'demote' };
      const result = await groupService.updateMemberRole(
        groupId,
        request.user.id,
        targetUserId,
        action,
      );
      return { success: true, message: result.message };
    },
  );

  // POST /api/v1/groups/:groupId/leave - 退出群组
  fastify.post(
    '/api/v1/groups/:groupId/leave',
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
    async (request, reply) => {
      const { groupId } = request.params as { groupId: string };
      // 检查是否是群主
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: request.user.id },
      });

      if (!membership) {
        throw fastify.httpErrors.notFound('Not a member');
      }

      if (membership.role === 'OWNER') {
        throw fastify.httpErrors.badRequest('Owner cannot leave; transfer ownership first');
      }

      await prisma.groupMember.delete({
        where: { id: membership.id },
      });

      return { success: true, message: 'Left group' };
    },
  );
}
