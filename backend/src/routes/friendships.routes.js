import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取当前用户的好友列表（或好友关系）
 * GET /api/v1/friends?status=
 * Query param status: pending|accepted|blocked (optional)
 */
export async function listFriendsHandler(request, reply) {
  const userId = request.user.id;
  const { status } = request.query;

  try {
    // 查找所有涉及当前用户的 friendship 记录
    const where = {
      OR: [
        { userId },
        { friendId: userId }
      ],
      ...(status && { status: status.toUpperCase() })
    };

    const friendships = await prisma.friendship.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, nickname: true, avatar: true }
        },
        friend: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 为每条记录标识当前用户是 sender 还是 receiver
    const enriched = friendships.map(f => {
      const isRequester = f.userId === userId;
      const otherUser = isRequester ? f.friend : f.user;
      const otherUserId = isRequester ? f.friendId : f.userId;
      return {
        id: f.id,
        otherUser,
        otherUserId,
        status: f.status,
        createdAt: f.createdAt,
        // 可选：当前用户在这条记录中的角色
        isRequester
      };
    });

    return reply.send({ friendships: enriched });
  } catch (error) {
    console.error('List friends error:', error);
    return reply.code(500).send({ error: 'Failed to fetch friends' });
  }
}

/**
 * 发送好友请求
 * POST /api/v1/friends
 * Body: { friendId: number }
 */
export async function sendFriendRequestHandler(request, reply) {
  const userId = request.user.id;
  const { friendId } = request.body;

  if (!friendId) {
    return reply.code(400).send({ error: 'friendId is required' });
  }

  if (friendId === userId) {
    return reply.code(400).send({ error: 'Cannot friend yourself' });
  }

  try {
    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId }
    });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // 检查是否已存在关系（任一方）
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });
    if (existing) {
      return reply.code(409).send({ error: 'Friendship already exists or pending' });
    }

    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, username: true, nickname: true, avatar: true }
        },
        friend: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      }
    });

    return reply.code(201).send({
      id: friendship.id,
      otherUser: friendship.friend,
      otherUserId: friendship.friendId,
      status: friendship.status,
      createdAt: friendship.createdAt
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return reply.code(500).send({ error: 'Failed to send friend request' });
  }
}

/**
 * 更新好友关系状态（接受/拒绝/屏蔽）
 * PUT /api/v1/friends/:id (这里的 :id 是目标用户的 ID)
 * Body: { status: 'accepted' | 'blocked' }
 */
export async function updateFriendStatusHandler(request, reply) {
  const userId = request.user.id;
  const { id: friendId } = request.params;
  const { status } = request.body;

  if (!['ACCEPTED', 'BLOCKED'].includes(status?.toUpperCase())) {
    return reply.code(400).send({ error: 'Invalid status' });
  }

  try {
    // 查找涉及当前用户的 friendship 记录（两个方向都要考虑）
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId: parseInt(friendId) },
          { userId: parseInt(friendId), friendId: userId }
        ]
      }
    });

    if (!friendship) {
      return reply.code(404).send({ error: 'Friendship not found' });
    }

    // 权限检查：只有请求的接收方（即 friendId 等于当前用户）可以接受请求；发送方可以屏蔽？
    // Simplified: 只要涉及就可以修改
    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: status.toUpperCase() }
    });

    return reply.send({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt ?? updated.createdAt
    });
  } catch (error) {
    console.error('Update friend status error:', error);
    return reply.code(500).send({ error: 'Failed to update friendship status' });
  }
}

/**
 * 删除好友关系
 * DELETE /api/v1/friends/:id (目标用户 ID)
 */
export async function deleteFriendHandler(request, reply) {
  const userId = request.user.id;
  const { id: friendId } = request.params;

  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId: parseInt(friendId) },
          { userId: parseInt(friendId), friendId: userId }
        ]
      }
    });

    if (!friendship) {
      return reply.code(404).send({ error: 'Friendship not found' });
    }

    await prisma.friendship.delete({ where: { id: friendship.id } });
    return reply.code(204).send();
  } catch (error) {
    console.error('Delete friend error:', error);
    return reply.code(500).send({ error: 'Failed to delete friendship' });
  }
}
