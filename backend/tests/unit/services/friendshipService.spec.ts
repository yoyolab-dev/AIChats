jest.mock('@prisma/client', () => {
  const instance = {
    user: { findUnique: jest.fn() },
    friendship: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => instance),
  };
});

import { PrismaClient } from '@prisma/client';
import { FriendshipService } from '@/services/friendshipService';

const MockPrisma = PrismaClient as jest.Mocked<typeof PrismaClient>;
const prismaInstance = (MockPrisma as any).mock.results[0]?.value;

describe('FriendshipService', () => {
  let _prisma: any;

  beforeAll(() => {
    _prisma = prismaInstance;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should send a friend request successfully', async () => {
      const friendship = {
        id: 'f-123',
        userId: 'user-1',
        friendId: 'user-2',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', username: 'alice', nickname: 'Alice', avatar: null, isOnline: false },
        friend: { id: 'user-2', username: 'bob', nickname: 'Bob', avatar: null, isOnline: true },
      };

      _prisma.friendship.findFirst.mockResolvedValue(null);
      _prisma.friendship.create.mockResolvedValue(friendship);

      const result = await new FriendshipService().sendRequest('user-1', 'user-2');

      expect(result).toEqual(friendship);
      expect(_prisma.friendship.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', friendId: 'user-2', status: 'PENDING' },
        include: {
          user: { select: { id: true, username: true, nickname: true, avatar: true, isOnline: true } },
          friend: { select: { id: true, username: true, nickname: true, avatar: true, isOnline: true } },
        },
      });
    });

    it('should throw error if sending request to self', async () => {
      await expect(new FriendshipService().sendRequest('user-1', 'user-1')).rejects.toThrow('Cannot send friend request to yourself');
    });

    it('should throw error if already friends', async () => {
      _prisma.friendship.findFirst.mockResolvedValue({ id: 'f-123', userId: 'user-1', friendId: 'user-2', status: 'ACCEPTED' });
      await expect(new FriendshipService().sendRequest('user-1', 'user-2')).rejects.toThrow('Already friends');
    });

    it('should throw error if request already pending', async () => {
      _prisma.friendship.findFirst.mockResolvedValue({ id: 'f-123', userId: 'user-1', friendId: 'user-2', status: 'PENDING' });
      await expect(new FriendshipService().sendRequest('user-1', 'user-2')).rejects.toThrow('Friend request already pending');
    });

    it('should throw error if blocked', async () => {
      _prisma.friendship.findFirst.mockResolvedValue({ id: 'f-123', userId: 'user-1', friendId: 'user-2', status: 'BLOCKED' });
      await expect(new FriendshipService().sendRequest('user-1', 'user-2')).rejects.toThrow('Cannot send request: blocked');
    });

    it('should check both directions for existing friendship', async () => {
      _prisma.friendship.findFirst.mockResolvedValue(null);
      await new FriendshipService().sendRequest('user-1', 'user-2');
      expect(_prisma.friendship.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ userId: 'user-1', friendId: 'user-2' }, { userId: 'user-2', friendId: 'user-1' }] },
      });
    });
  });

  describe('handleRequest', () => {
    it('should accept friend request', async () => {
      const friendship = { id: 'f-123', userId: 'user-2', friendId: 'user-1', status: 'PENDING', user: { id: 'user-2', username: 'bob' }, friend: { id: 'user-1', username: 'alice' } };
      _prisma.friendship.findUnique.mockResolvedValue(friendship);
      _prisma.friendship.update.mockResolvedValue({ ...friendship, status: 'ACCEPTED' });
      const result = await new FriendshipService().handleRequest('f-123', 'user-1', 'accept');
      expect(result.status).toBe('ACCEPTED');
      expect(_prisma.friendship.update).toHaveBeenCalledWith({ where: { id: 'f-123' }, data: { status: 'ACCEPTED' }, include: { user: true, friend: true } });
    });

    it('should reject friend request', async () => {
      const friendship = { id: 'f-123', userId: 'user-2', friendId: 'user-1', status: 'PENDING' };
      _prisma.friendship.findUnique.mockResolvedValue(friendship);
      _prisma.friendship.update.mockResolvedValue({ ...friendship, status: 'PENDING' });
      const result = await new FriendshipService().handleRequest('f-123', 'user-1', 'reject');
      expect(result.status).toBe('PENDING');
      expect(_prisma.friendship.update).toHaveBeenCalledWith({ where: { id: 'f-123' }, data: { status: 'PENDING' }, include: expect.any(Object) });
    });

    it('should block user', async () => {
      const friendship = { id: 'f-123', userId: 'user-2', friendId: 'user-1', status: 'PENDING' };
      _prisma.friendship.findUnique.mockResolvedValue(friendship);
      _prisma.friendship.update.mockResolvedValue({ ...friendship, status: 'BLOCKED' });
      const result = await new FriendshipService().handleRequest('f-123', 'user-1', 'block');
      expect(result.status).toBe('BLOCKED');
    });

    it('should throw error if friendship not found', async () => {
      _prisma.friendship.findUnique.mockResolvedValue(null);
      await expect(new FriendshipService().handleRequest('nonexistent', 'user-1', 'accept')).rejects.toThrow('Friendship not found');
    });

    it('should throw error if not authorized', async () => {
      const friendship = { id: 'f-123', userId: 'user-1', friendId: 'user-2', status: 'PENDING' };
      _prisma.friendship.findUnique.mockResolvedValue(friendship);
      await expect(new FriendshipService().handleRequest('f-123', 'other-user', 'accept')).rejects.toThrow('Not authorized to handle this request');
    });
  });

  describe('getFriends', () => {
    it('should return list of accepted friends', async () => {
      const friendships = [{ id: 'f-123', user: { id: 'user-1', username: 'alice' }, friend: { id: 'friend-1', username: 'bob', nickname: 'Bob', avatar: null, isOnline: true, lastSeenAt: new Date() }, status: 'ACCEPTED', createdAt: new Date() }];
      _prisma.friendship.findMany.mockResolvedValue(friendships);
      const result = await new FriendshipService().getFriends('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'f-123', friendId: 'friend-1', username: 'bob', isRequester: true });
      expect(_prisma.friendship.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1', status: 'ACCEPTED' }, include: expect.any(Object), orderBy: { createdAt: 'desc' } });
    });

    it('should support filtering by status', async () => {
      _prisma.friendship.findMany.mockResolvedValue([]);
      await new FriendshipService().getFriends('user-1', 'PENDING');
      expect(_prisma.friendship.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1', status: 'PENDING' }, include: expect.any(Object), orderBy: { createdAt: 'desc' } });
    });
  });

  describe('getIncomingRequests', () => {
    it('should return incoming friend requests', async () => {
      const friendships = [{ id: 'f-123', user: { id: 'requester-1', username: 'charlie', nickname: 'Charlie', avatar: null, isOnline: false }, friendId: 'user-1', status: 'PENDING', createdAt: new Date() }];
      _prisma.friendship.findMany.mockResolvedValue(friendships);
      const result = await new FriendshipService().getIncomingRequests('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'f-123', userId: 'requester-1', username: 'charlie', isRequester: false });
      expect(_prisma.friendship.findMany).toHaveBeenCalledWith({ where: { friendId: 'user-1', status: 'PENDING' }, include: expect.any(Object), orderBy: { createdAt: 'desc' } });
    });
  });

  describe('removeFriendship', () => {
    it('should remove friendship between two users', async () => {
      _prisma.friendship.deleteMany.mockResolvedValue({ count: 1 });
      const result = await new FriendshipService().removeFriendship('user-1', 'friend-1');
      expect(result).toBe(true);
      expect(_prisma.friendship.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ userId: 'user-1', friendId: 'friend-1' }, { userId: 'friend-1', friendId: 'user-1' }] } });
    });

    it('should return false if no friendship found', async () => {
      _prisma.friendship.deleteMany.mockResolvedValue({ count: 0 });
      const result = await new FriendshipService().removeFriendship('user-1', 'friend-1');
      expect(result).toBe(false);
    });
  });
});
