import { PrismaClient } from '@prisma/client';
import { generateApiKey } from '../utils/apiKey.js';

const prisma = new PrismaClient();

/**
 * 注册新用户
 * POST /api/v1/auth/register
 * Body: { username: string, nickname?: string, password?: string }
 */
export async function registerHandler(request, reply) {
  const { username, nickname, password } = request.body;

  if (!username) {
    return reply.code(400).send({ error: 'Username is required' });
  }

  // 检查用户名是否已存在
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return reply.code(409).send({ error: 'Username already taken' });
  }

  const apiKey = generateApiKey();

  try {
    const user = await prisma.user.create({
      data: {
        username,
        nickname: nickname || username,
        apiKey,
        role: 'USER',
      },
      select: { id: true, username: true, nickname: true, role: true, avatar: true, createdAt: true }
    });

    // 返回时带上 apiKey（仅此一次）
    return reply.code(201).send({ ...user, apiKey });
  } catch (error) {
    console.error('Registration error:', error);
    return reply.code(500).send({ error: 'Failed to create user' });
  }
}

/**
 * 获取当前用户信息
 * GET /api/v1/users/me
 * Requires auth
 */
export async function getMeHandler(request, reply) {
  return reply.send({ user: request.user });
}

/**
 * 获取用户列表（仅管理员）
 * GET /api/v1/users?page=1&limit=20
 */
export async function listUsersHandler(request, reply) {
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const page = Math.max(1, parseInt(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
  const skip = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, username: true, nickname: true, role: true, avatar: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    reply.header('X-Total-Count', total);
    return reply.send({
      page,
      limit,
      total,
      users
    });
  } catch (error) {
    console.error('List users error:', error);
    return reply.code(500).send({ error: 'Failed to fetch users' });
  }
}

/**
 * 获取单个用户详情
 * GET /api/v1/users/:id
 */
export async function getUserHandler(request, reply) {
  const { id } = request.params;
  const isAdmin = request.user.role === 'ADMIN';
  const isSelf = request.user.id === parseInt(id);

  if (!isAdmin && !isSelf) {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true, nickname: true, role: true, avatar: true, createdAt: true }
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return reply.code(500).send({ error: 'Failed to fetch user' });
  }
}

/**
 * 更新用户信息
 * PUT /api/v1/users/:id
 */
export async function updateUserHandler(request, reply) {
  const { id } = request.params;
  const isAdmin = request.user.role === 'ADMIN';
  const isSelf = request.user.id === parseInt(id);

  if (!isAdmin && !isSelf) {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const { nickname, avatar } = request.body;

  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(avatar !== undefined && { avatar })
      },
      select: { id: true, username: true, nickname: true, role: true, avatar: true, createdAt: true }
    });

    return reply.send({ user });
  } catch (error) {
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'User not found' });
    }
    console.error('Update user error:', error);
    return reply.code(500).send({ error: 'Failed to update user' });
  }
}

/**
 * 删除用户
 * DELETE /api/v1/users/:id
 */
export async function deleteUserHandler(request, reply) {
  const { id } = request.params;
  const isAdmin = request.user.role === 'ADMIN';
  const isSelf = request.user.id === parseInt(id);

  if (!isAdmin && !isSelf) {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    return reply.code(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'User not found' });
    }
    console.error('Delete user error:', error);
    return reply.code(500).send({ error: 'Failed to delete user' });
  }
}
