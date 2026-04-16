import { authenticate } from '../plugins/auth.js';
import { prisma } from '../plugins/prisma.js';

export default async function (fastify, opts) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/users/me/friends
  fastify.get('/friends', async (request, reply) => {
    const friendships = await prisma.friendship.findMany({
      where: { userId: request.user.id, status: 'accepted' },
      include: { friend: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    });
    return { success: true, data: friendships.map(f => f.friend) };
  });

  // POST /api/v1/users/me/friends
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
    const existing = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId: request.user.id, friendId: friendUser.id } }
    });
    if (existing) {
      return reply.code(409).send({ success: false, error: 'Friendship already exists' });
    }
    const friendship = await prisma.friendship.create({
      data: { userId: request.user.id, friendId: friendUser.id, status: 'accepted' }
    });
    return { success: true, data: friendship };
  });

  // DELETE /api/v1/users/me/friends/:username
  fastify.delete('/friends/:username', async (request, reply) => {
    const { username } = request.params;
    const friendUser = await prisma.user.findUnique({ where: { username } });
    if (!friendUser) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }
    await prisma.friendship.delete({
      where: { userId_friendId: { userId: request.user.id, friendId: friendUser.id } }
    });
    return { success: true, data: { deleted: true } };
  });
}
