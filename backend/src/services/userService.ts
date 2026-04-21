import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { generateApiKey } from '@/utils/apiKey';
import type { RegisterUserDto, UpdateUserDto, Role } from '@/types/user';

const prisma = new PrismaClient();

const registerSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(50, '用户名最多 50 个字符')
    .regex(/^[a-z0-9_]+$/, '用户名仅允许小写字母、数字、下划线'),
  nickname: z.string().max(100).optional(),
});

export class UserService {
  async register(data: RegisterUserDto) {
    const parsed = registerSchema.parse(data);

    // 检查用户名是否已存在
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: parsed.username }, { username: parsed.username.toLowerCase() }] },
    });
    if (existing) {
      throw new Error('Username already exists');
    }

    const apiKey = generateApiKey();

    const user = await prisma.user.create({
      data: {
        username: parsed.username.toLowerCase(),
        nickname: parsed.nickname || parsed.username,
        apiKey,
        role: 'USER',
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        apiKey: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        avatar: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateUser(userId: string, data: UpdateUserDto) {
    const updateData: any = {};
    if (data.nickname !== undefined) {
      updateData.nickname = data.nickname === '' ? null : data.nickname;
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    role?: Role;
    search?: string;
  }) {
        const { page = 1, limit = 20, role, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { nickname: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          nickname: true,
          apiKey: true,
          role: true,
          isOnline: true,
          lastSeenAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resetApiKey(userId: string) {
    const newApiKey = generateApiKey();

    const user = await prisma.user.update({
      where: { id: userId },
      data: { apiKey: newApiKey },
      select: {
        id: true,
        username: true,
        apiKey: true,
      },
    });

    return user;
  }

  /**
   * 搜索用户（排除自己）
   */
  async searchUsers(keyword: string, excludeUserId: string, limit: number = 20) {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: excludeUserId } },
          {
            OR: [
              { username: { contains: keyword, mode: 'insensitive' } },
              { nickname: { contains: keyword, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        isOnline: true,
        lastSeenAt: true,
      },
      take: limit,
      orderBy: [{ username: 'asc' }],
    });

    return users;
  }
}