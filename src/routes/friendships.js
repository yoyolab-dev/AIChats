import { authenticate } from '../plugins/auth.js';
import { prisma } from '../plugins/prisma.js';

export default async function (fastify, opts) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/users/me/friends
  fastify.get('/friends', async (request, reply) => {
    const userId = request.user.id;
    const friendships = await prisma.friendship.findMany({
      where: {
        AND: [
          { OR: [{ userId }, { friendId: userId }] },
          { status: 'accepted' }
        ]
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        friend: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
      }
    });

    const friends = friendships.map(f => {
      return f.userId === userId ? f.friend : f.user;
    });

    return { success: true, data: friends };
  });

  // POST /api/v1/users/me/friends -- send friend request
  fastify.post('/friends', async (request, reply) => {
    const { friendUsername } = request.body;
    if (!friendUsername) {
      return reply.code(400).send({ success: false, error: 'friendUsername required' });
    }
    const friendUser = await prisma.user.findUnique({
      where: { username: friendUsername }
    });
    if (!friendUser) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }
    if (friendUser.id === request.user.id) {
      return reply.code(400).send({ success: false, error: 'Cannot friend yourself' });
    }
    // Check both directions
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: request.user.id, friendId: friendUser.id },
          { userId: friendUser.id, friendId: request.user.id }
        ]
      }
    });
    if (existing) {
      return reply.code(409).send({ success: false, error: 'Friendship already exists' });
    }
    const friendship = await prisma.friendship.create({
      data: { userId: request.user.id, friendId: friendUser.id, status: 'pending' }
    });
    return { success: true, data: friendship };
  });

  // PUT /api/v1/users/me/friends/:username -- update friendship status
  fastify.put('/friends/:username', async (request, reply) => {
    const { username } = request.params;
    const { status } = request.body;
    if (!['accepted', 'rejected', 'blocked'].includes(status)) {
      return reply.code(400).send({ success: false, error: 'Invalid status' });
    }
    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }
    const meId = request.user.id;
    const friendId = targetUser.id;
    // Find any friendship between me and target in either direction
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: meId, friendId },
          { userId: friendId, friendId: meId }
        ]
      }
    });
    if (!friendship) {
      return reply.code(404).send({ success: false, error: 'Friendship not found' });
    }

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status }
    });
    return { success: true, data: updated };
  });

  // DELETE /api/v1/users/me/friends/:username
  fastify.delete('/friends/:username', async (request, reply) => {
    const { username } = request.params;
    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }
    const meId = request.user.id;
    const friendId = targetUser.id;
    // Find the friendship either as requester or receiver
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: meId, friendId },
          { userId: friendId, friendId: meId }
        ]
      }
    });
    if (!friendship) {
      return reply.code(404).send({ success: false, error: 'Friendship not found' });
    }
    await prisma.friendship.delete({ where: { id: friendship.id } });
    return { success: true, data: { deleted: true } };
  });
}
