import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 创建群组
 * POST /api/v1/groups
 * Body: { name: string, description?: string }
 */
export async function createGroupHandler(request, reply) {
  const ownerId = request.user.id;
  const { name, description } = request.body;

  if (!name) {
    return reply.code(400).send({ error: 'Group name is required' });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name,
        description,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER'
          }
        }
      },
      include: {
        owner: {
          select: { id: true, username: true, nickname: true, avatar: true }
        },
        members: {
          where: { userId: ownerId },
          select: {
            user: {
              select: { id: true, username: true, nickname: true, avatar: true }
            },
            role: true
          }
        }
      }
    });

    return reply.code(201).send(group);
  } catch (error) {
    console.error('Create group error:', error);
    return reply.code(500).send({ error: 'Failed to create group' });
  }
}

/**
 * 获取群组列表
 * GET /api/v1/groups?userId= (optional, admin only)
 */
export async function listGroupsHandler(request, reply) {
  const isAdmin = request.user.role === 'ADMIN';
  const { userId } = request.query;

  if (userId && !isAdmin) {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const targetUserId = userId ? parseInt(userId) : request.user.id;

  try {
    const members = await prisma.groupMember.findMany({
      where: { userId: targetUserId },
      include: {
        group: {
          include: {
            owner: {
              select: { id: true, username: true, nickname: true, avatar: true }
            },
            members: {
              include: {
                user: {
                  select: { id: true, username: true, nickname: true, avatar: true }
                }
              }
            }
          }
        }
      }
    });

    const groups = members.map(m => m.group);
    return reply.send({ groups });
  } catch (error) {
    console.error('List groups error:', error);
    return reply.code(500).send({ error: 'Failed to fetch groups' });
  }
}

/**
 * 添加群组成员
 * POST /api/v1/groups/:groupId/members
 * Body: { userId: number }
 */
export async function addGroupMemberHandler(request, reply) {
  const actorId = request.user.id;
  const { groupId } = request.params;
  const { userId } = request.body;

  if (!userId) {
    return reply.code(400).send({ error: 'userId is required' });
  }

  try {
    const group = await prisma.group.findUnique({ where: { id: parseInt(groupId) } });
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    // 权限：仅群主或管理员
    const actorMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: parseInt(groupId), userId: actorId } }
    });
    if (!actorMembership || !['OWNER', 'ADMIN'].includes(actorMembership.role)) {
      return reply.code(403).send({ error: 'Only group admin can add members' });
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // 检查是否已是成员
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: parseInt(groupId), userId } }
    });
    if (existing) {
      return reply.code(409).send({ error: 'User is already a member' });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: parseInt(groupId),
        userId,
        role: 'MEMBER'
      },
      include: {
        user: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      }
    });

    return reply.code(201).send(member);
  } catch (error) {
    console.error('Add group member error:', error);
    return reply.code(500).send({ error: 'Failed to add member' });
  }
}

/**
 * 移除群组成员
 * DELETE /api/v1/groups/:groupId/members/:userId
 */
export async function removeGroupMemberHandler(request, reply) {
  const actorId = request.user.id;
  const { groupId, userId } = request.params;

  try {
    const group = await prisma.group.findUnique({ where: { id: parseInt(groupId) } });
    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    // 权限：群主或管理员，或用户自己退出
    if (actorId !== parseInt(userId)) {
      const actorMembership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: parseInt(groupId), userId: actorId } }
      });
      if (!actorMembership || !['OWNER', 'ADMIN'].includes(actorMembership.role)) {
        return reply.code(403).send({ error: 'Only group admin can remove members' });
      }
    }

    const deleted = await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: parseInt(groupId), userId: parseInt(userId) } }
    });

    if (!deleted) {
      return reply.code(404).send({ error: 'Membership not found' });
    }

    return reply.code(204).send();
  } catch (error) {
    console.error('Remove group member error:', error);
    return reply.code(500).send({ error: 'Failed to remove member' });
  }
}

/**
 * 获取群组消息
 * GET /api/v1/groups/:groupId/messages?before=timestamp&limit=50
 */
export async function getGroupMessagesHandler(request, reply) {
  const userId = request.user.id;
  const { groupId } = request.params;
  const { before, limit = 50 } = request.query;

  try {
    // 验证用户是群成员
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: parseInt(groupId), userId } }
    });
    if (!membership) {
      return reply.code(403).send({ error: 'Not a member of this group' });
    }

    const where = {
      groupId: parseInt(groupId),
      ...(before && { createdAt: { lt: new Date(before) } })
    };

    const messages = await prisma.groupMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, parseInt(limit))
    });

    return reply.send({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get group messages error:', error);
    return reply.code(500).send({ error: 'Failed to fetch group messages' });
  }
}

/**
 * 发送群组消息
 * POST /api/v1/groups/:groupId/messages
 * Body: { content: string }
 */
export async function sendGroupMessageHandler(request, reply) {
  const senderId = request.user.id;
  const { groupId } = request.params;
  const { content } = request.body;

  if (!content) {
    return reply.code(400).send({ error: 'content is required' });
  }

  try {
    // 验证用户是群成员
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: parseInt(groupId), userId: senderId } }
    });
    if (!membership) {
      return reply.code(403).send({ error: 'Not a member of this group' });
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId: parseInt(groupId),
        senderId,
        content
      },
      include: {
        sender: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      }
    });

    // TODO: 更新 group.lastMessageId (可选，优化性能)

    return reply.code(201).send(message);
  } catch (error) {
    console.error('Send group message error:', error);
    return reply.code(500).send({ error: 'Failed to send group message' });
  }
}
