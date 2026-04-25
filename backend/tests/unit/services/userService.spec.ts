jest.mock('@prisma/client', () => {
  const instance = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => instance),
  };
});

import { PrismaClient } from '@prisma/client';
import { UserService } from '@/services/userService';

const MockPrisma = PrismaClient as jest.Mocked<typeof PrismaClient>;
const prismaInstance = (MockPrisma as any).mock.results[0]?.value;

describe('UserService', () => {
  let _prisma: any;

  beforeAll(() => {
    _prisma = prismaInstance;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: 'Test User',
        apiKey: 'sk_live_' + 'a'.repeat(64),
        role: 'USER',
        createdAt: new Date(),
      };

      _prisma.user.findFirst.mockResolvedValue(null);
      _prisma.user.create.mockResolvedValue(mockUser);

      const result = await new UserService().register({ username: 'testuser', nickname: 'Test User' });

      expect(result).toEqual(mockUser);
      expect(_prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ username: 'testuser' }, { username: 'testuser' }] },
      });
      expect(_prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          nickname: 'Test User',
          apiKey: expect.stringMatching(/^sk_live_[a-f0-9]{64}$/),
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
    });

    it('should throw error if username already exists', async () => {
      _prisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        username: 'testuser',
      });

      await expect(new UserService().register({ username: 'testuser' })).rejects.toThrow('Username already exists');
    });

    it('should use username as nickname if not provided', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: 'testuser',
        apiKey: 'sk_live_' + 'a'.repeat(64),
        role: 'USER',
        createdAt: new Date(),
      };

      _prisma.user.findFirst.mockResolvedValue(null);
      _prisma.user.create.mockResolvedValue(mockUser);

      await new UserService().register({ username: 'testuser' });

      expect(_prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          nickname: 'testuser',
          apiKey: expect.any(String),
          role: 'USER',
        },
        select: expect.any(Object),
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: 'Test User',
        role: 'USER',
        avatar: null,
        isOnline: false,
        lastSeenAt: null,
        createdAt: new Date(),
      };

      _prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await new UserService().getUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(_prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
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
    });

    it('should throw error if user not found', async () => {
      _prisma.user.findUnique.mockResolvedValue(null);

      await expect(new UserService().getUserById('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update nickname only', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: 'New Nickname',
        avatar: null,
        role: 'USER',
        updatedAt: new Date(),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      const result = await new UserService().updateUser('user-123', { nickname: 'New Nickname' });

      expect(result).toEqual(mockUser);
      expect(_prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { nickname: 'New Nickname' },
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
          role: true,
          updatedAt: true,
        },
      });
    });

    it('should set nickname to null if empty string provided', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: null,
        avatar: null,
        role: 'USER',
        updatedAt: new Date(),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      await new UserService().updateUser('user-123', { nickname: '' });

      expect(_prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { nickname: null },
        select: expect.any(Object),
      });
    });

    it('should update avatar only', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: null,
        avatar: 'https://example.com/avatar.jpg',
        role: 'USER',
        updatedAt: new Date(),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      const result = await new UserService().updateUser('user-123', { avatar: 'https://example.com/avatar.jpg' });

      expect(result).toEqual(mockUser);
      expect(_prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: 'https://example.com/avatar.jpg' },
        select: expect.any(Object),
      });
    });

    it('should update both nickname and avatar', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: 'New Nick',
        avatar: 'https://example.com/avatar.jpg',
        role: 'USER',
        updatedAt: new Date(),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      const result = await new UserService().updateUser('user-123', {
        nickname: 'New Nick',
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(result).toEqual(mockUser);
      expect(_prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { nickname: 'New Nick', avatar: 'https://example.com/avatar.jpg' },
        select: expect.any(Object),
      });
    });

    it('should handle undefined fields by not including them in update', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: null,
        avatar: null,
        role: 'USER',
        updatedAt: new Date(),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      await new UserService().updateUser('user-123', {});

      expect(_prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {},
        select: expect.any(Object),
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users without filters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          nickname: 'User 1',
          apiKey: 'key1',
          role: 'USER',
          isOnline: false,
          lastSeenAt: null,
          createdAt: new Date(),
        },
        {
          id: 'user-2',
          username: 'user2',
          nickname: 'User 2',
          apiKey: 'key2',
          role: 'USER',
          isOnline: true,
          lastSeenAt: new Date(),
          createdAt: new Date(),
        },
      ];

      _prisma.user.findMany.mockResolvedValue(mockUsers);
      _prisma.user.count.mockResolvedValue(2);

      const result = await new UserService().getAllUsers({ page: 1, limit: 20 });

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });
      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(_prisma.user.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should apply role filter', async () => {
      _prisma.user.findMany.mockResolvedValue([]);
      _prisma.user.count.mockResolvedValue(0);

      await new UserService().getAllUsers({ page: 1, limit: 20, role: 'ADMIN' });

      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply search filter', async () => {
      _prisma.user.findMany.mockResolvedValue([]);
      _prisma.user.count.mockResolvedValue(0);

      await new UserService().getAllUsers({ page: 1, limit: 20, search: 'john' });

      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { contains: 'john' } },
            { nickname: { contains: 'john' } },
          ],
        },
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should calculate pagination correctly', async () => {
      _prisma.user.findMany.mockResolvedValue([]);
      _prisma.user.count.mockResolvedValue(100);

      const result = await new UserService().getAllUsers({ page: 2, limit: 20 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
      });
      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 20,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use default values for page and limit', async () => {
      _prisma.user.findMany.mockResolvedValue([]);
      _prisma.user.count.mockResolvedValue(0);

      await new UserService().getAllUsers({});

      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('resetApiKey', () => {
    it('should generate new apiKey and update user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        apiKey: 'sk_live_' + 'b'.repeat(64),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      const result = await new UserService().resetApiKey('user-123');

      expect(result).toEqual(mockUser);
      expect(_prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { apiKey: expect.stringMatching(/^sk_live_[a-f0-9]{64}$/) },
        select: {
          id: true,
          username: true,
          apiKey: true,
        },
      });
    });

    it('should generate a different apiKey each time', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        apiKey: 'sk_live_' + 'a'.repeat(64),
      };

      _prisma.user.update.mockResolvedValue(mockUser);

      await new UserService().resetApiKey('user-123');
      const firstKey = _prisma.user.update.mock.calls[0][0].data.apiKey;

      jest.clearAllMocks();
      await new UserService().resetApiKey('user-123');
      const secondKey = _prisma.user.update.mock.calls[0][0].data.apiKey;

      expect(firstKey).not.toBe(secondKey);
    });
  });

  describe('searchUsers', () => {
    it('should search users by keyword', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'john_doe',
          nickname: 'John Doe',
          avatar: null,
          isOnline: true,
          lastSeenAt: new Date(),
        },
        {
          id: 'user-2',
          username: 'jane_smith',
          nickname: 'Jane Smith',
          avatar: null,
          isOnline: false,
          lastSeenAt: null,
        },
      ];

      _prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await new UserService().searchUsers('john', 'current-user-id');

      expect(result).toEqual(mockUsers);
      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { not: 'current-user-id' } },
            {
              OR: [
                { username: { contains: 'john' } },
                { nickname: { contains: 'john' } },
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
        take: 20,
        orderBy: [{ username: 'asc' }],
      });
    });

    it('should respect custom limit', async () => {
      _prisma.user.findMany.mockResolvedValue([]);

      await new UserService().searchUsers('john', 'current-user-id', 10);

      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        select: expect.any(Object),
        take: 10,
        orderBy: [{ username: 'asc' }],
      });
    });

    it('should exclude the specified user', async () => {
      _prisma.user.findMany.mockResolvedValue([]);

      await new UserService().searchUsers('john', 'exclude-me');

      expect(_prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { not: 'exclude-me' } },
            {
              OR: [
                { username: { contains: 'john' } },
                { nickname: { contains: 'john' } },
              ],
            },
          ],
        },
        select: expect.any(Object),
        take: 20,
        orderBy: [{ username: 'asc' }],
      });
    });
  });
});
