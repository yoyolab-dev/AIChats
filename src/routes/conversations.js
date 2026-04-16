import { authenticate } from '../plugins/auth.js';

export default async function (fastify, opts) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/conversations
  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const conversations = await request.prisma.conversation.findMany({
      where: {
        participantIds: { has: userId }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        lastMessage: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    return { success: true, data: conversations };
  });

  // POST /api/v1/conversations
  fastify.post('/', async (request, reply) => {
    const { participantIds } = request.body;
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
      return reply.code(400).send({ success: false, error: 'participantIds array required' });
    }
    const participants = [...new Set([request.user.id, ...participantIds])];
    const conversation = await request.prisma.conversation.create({
      data: {
        participantIds: participants,
      }
    });
    return { success: true, data: conversation };
  });

  // GET /api/v1/conversations/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const conversation = await request.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          where: { deleted: false }
        }
      }
    });
    if (!conversation) {
      return reply.code(404).send({ success: false, error: 'Conversation not found' });
    }
    if (!conversation.participantIds.includes(request.user.id)) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }
    return { success: true, data: conversation };
  });

  // DELETE /api/v1/conversations/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const conversation = await request.prisma.conversation.findUnique({
      where: { id }
    });
    if (!conversation) {
      return reply.code(404).send({ success: false, error: 'Conversation not found' });
    }
    if (!conversation.participantIds.includes(request.user.id)) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }
    await request.prisma.conversation.delete({
      where: { id }
    });
    return { success: true, data: { deleted: true } };
  });
}
