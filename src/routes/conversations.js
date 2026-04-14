import { Router } from 'fastify';
import { authenticate } from '../plugins/auth.js';

const router = Router();
router.addHook('preHandler', authenticate);

// GET /api/v1/conversations - 列出当前用户参与的会话
router.get('/', async (request, reply) => {
  const userId = request.user.id;
  // Find conversations where participantIds includes userId
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

// POST /api/v1/conversations - 创建会话
router.post('/', async (request, reply) => {
  const { participantIds } = request.body;
  if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
    return reply.code(400).send({ success: false, error: 'participantIds array required' });
  }
  // Ensure the creator is included
  const participants = [...new Set([request.user.id, ...participantIds])];
  const conversation = await request.prisma.conversation.create({
    data: {
      participantIds: participants,
    }
  });
  return { success: true, data: conversation };
});

// GET /api/v1/conversations/:id - 会话详情
router.get('/:id', async (request, reply) => {
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
  // Check participation
  if (!conversation.participantIds.includes(request.user.id)) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }
  return { success: true, data: conversation };
});

// DELETE /api/v1/conversations/:id - 删除会话（软删标记暂未实现，这里硬删？先软）
router.delete('/:id', async (request, reply) => {
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
  // Soft delete: not implemented, for now we just delete all messages? Better to add isDeleted flag later.
  // For now, actually delete the conversation (cascade messages if set)
  await request.prisma.conversation.delete({
    where: { id }
  });
  return { success: true, data: { deleted: true } };
});

export default router;