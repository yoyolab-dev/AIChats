jest.mock('@/services/wsManager', () => ({
  wsManager: { sendToUser: jest.fn() },
}));

jest.mock('@prisma/client', () => {
  const instance = {
    friendship: { findFirst: jest.fn() },
    message: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    groupMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    groupMember: { findFirst: jest.fn(), findMany: jest.fn() },
    group: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => instance),
  };
});

import { PrismaClient } from '@prisma/client';
import { ChatService } from '@/services/chatService';
const { wsManager } = require('@/services/wsManager');

const MockPrisma = PrismaClient as jest.Mocked<typeof PrismaClient>;
const prismaInstance = (MockPrisma as any).mock.results[0]?.value;

describe('ChatService', () => {
  let _prisma: any;

  beforeAll(() => {
    _prisma = prismaInstance;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getPrivateChatHistory', () => {
    it('should return chat history between friends', async () => {
      const messages = [
        {
          id: 'msg-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          content: 'Hello',
          type: 'text',
          isRead: false,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          sender: { id: 'user-1', username: 'alice', nickname: 'Alice', avatar: null },
          replyTo: null,
        },
        {
          id: 'msg-2',
          senderId: 'user-2',
          receiverId: 'user-1',
          content: 'Hi',
          type: 'text',
          isRead: true,
          createdAt: new Date('2024-01-01T10:01:00Z'),
          sender: { id: 'user-2', username: 'bob', nickname: 'Bob', avatar: null },
          replyTo: null,
        },
      ];
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      _prisma.message.findMany.mockResolvedValue(messages);
      const result = await new ChatService().getPrivateChatHistory('user-1', 'user-2', 50);
      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should reverse messages to chronological order', async () => {
      const now = new Date();
      // DESC order from DB: newer first
      const messages = [
        {
          id: 'msg-2',
          createdAt: now,
          senderId: 'user-2',
          receiverId: 'user-1',
          content: 'Second',
          type: 'text',
          isRead: false,
          sender: { username: 'bob' },
          replyTo: null,
        },
        {
          id: 'msg-1',
          createdAt: new Date(now.getTime() - 60000),
          senderId: 'user-1',
          receiverId: 'user-2',
          content: 'First',
          type: 'text',
          isRead: false,
          sender: { username: 'alice' },
          replyTo: null,
        },
      ];
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      _prisma.message.findMany.mockResolvedValue(messages);
      const result = await new ChatService().getPrivateChatHistory('user-1', 'user-2', 50);
      expect(result.messages[0].content).toBe('First');
      expect(result.messages[1].content).toBe('Second');
    });

    it('should paginate correctly', async () => {
      const messages = Array.from({ length: 51 }, (_, i) => ({
        id: `msg-${i}`,
        senderId: i % 2 === 0 ? 'user-1' : 'user-2',
        receiverId: i % 2 === 0 ? 'user-2' : 'user-1',
        content: `Message ${i}`,
        type: 'text',
        isRead: false,
        createdAt: new Date(Date.now() - i * 60000),
        sender: {
          id: `user-${(i % 2) + 1}`,
          username: i % 2 === 0 ? 'alice' : 'bob',
          nickname: null,
          avatar: null,
        },
        replyTo: null,
      }));
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      _prisma.message.findMany.mockResolvedValue(messages);
      const result = await new ChatService().getPrivateChatHistory('user-1', 'user-2', 50);
      expect(result.messages).toHaveLength(50);
      expect(result.hasMore).toBe(true);
    });

    it('should support before cursor', async () => {
      const messages = [
        {
          id: 'msg-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          content: 'Older',
          type: 'text',
          isRead: false,
          createdAt: new Date('2024-01-01T09:00:00Z'),
          sender: { username: 'alice', nickname: null, avatar: null },
          replyTo: null,
        },
      ];
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      _prisma.message.findMany.mockResolvedValue(messages);
      await new ChatService().getPrivateChatHistory('user-1', 'user-2', 50, '2024-01-01T10:00:00Z');
      expect(_prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: expect.any(Date) },
          }),
        }),
      );
    });

    it('should throw error if not friends', async () => {
      _prisma.friendship.findFirst.mockResolvedValue(null);
      await expect(new ChatService().getPrivateChatHistory('user-1', 'user-2', 50)).rejects.toThrow(
        'Not friends',
      );
    });
  });

  describe('sendPrivateMessage', () => {
    it('should send message successfully', async () => {
      const message = {
        id: 'msg-123',
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Hello!',
        type: 'text',
        replyToId: null,
        isRead: false,
        createdAt: new Date(),
        sender: { id: 'user-1', username: 'alice', nickname: 'Alice', avatar: null },
        receiver: { id: 'user-2', username: 'bob', nickname: 'Bob', avatar: null },
        replyTo: null,
      };
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      _prisma.message.create.mockResolvedValue(message);
      wsManager.sendToUser.mockReturnValue(true);
      const result = await new ChatService().sendPrivateMessage('user-1', 'user-2', 'Hello!');
      expect(result).toEqual(message);
      expect(wsManager.sendToUser).toHaveBeenCalledWith('user-2', {
        type: 'message',
        payload: { message, chatType: 'private', targetId: 'user-1' },
      });
    });

    it('should include replyToId when provided', async () => {
      const message = {
        id: 'msg-123',
        senderId: 'user-1',
        receiverId: 'user-2',
        content: 'Reply',
        type: 'text',
        replyToId: 'msg-456',
        sender: { username: 'alice' },
        receiver: { username: 'bob' },
        replyTo: { id: 'msg-456', content: 'Original', sender: { username: 'sender' } },
      };
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      _prisma.message.create.mockResolvedValue(message);
      await new ChatService().sendPrivateMessage('user-1', 'user-2', 'Reply', 'text', 'msg-456');
      expect(_prisma.message.create).toHaveBeenCalledWith({
        data: {
          senderId: 'user-1',
          receiverId: 'user-2',
          content: 'Reply',
          type: 'text',
          replyToId: 'msg-456',
        },
        include: expect.any(Object),
      });
    });

    it('should throw error if not friends', async () => {
      _prisma.friendship.findFirst.mockResolvedValue(null);
      await expect(
        new ChatService().sendPrivateMessage('user-1', 'user-2', 'Hello'),
      ).rejects.toThrow('Cannot send message to non-friend');
    });

    it('should throw error if friendship is BLOCKED', async () => {
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'BLOCKED' });
      await expect(
        new ChatService().sendPrivateMessage('user-1', 'user-2', 'Hello'),
      ).rejects.toThrow('Cannot send message: blocked');
    });

    it('should reject message exceeding 5000 characters', async () => {
      _prisma.friendship.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      const longContent = 'a'.repeat(5001);
      await expect(
        new ChatService().sendPrivateMessage('user-1', 'user-2', longContent),
      ).rejects.toThrow('Message content exceeds 5000 characters');
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      _prisma.message.updateMany.mockResolvedValue({ count: 3 });
      const result = await new ChatService().markAsRead('user-1', 'user-2', [
        'msg-1',
        'msg-2',
        'msg-3',
      ]);
      expect(result).toBe(3);
      expect(_prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          receiverId: 'user-1',
          senderId: 'user-2',
          id: { in: ['msg-1', 'msg-2', 'msg-3'] },
          isRead: false,
        },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should mark all unread messages if no messageIds provided', async () => {
      _prisma.message.updateMany.mockResolvedValue({ count: 5 });
      await new ChatService().markAsRead('user-1', 'user-2');
      expect(_prisma.message.updateMany).toHaveBeenCalledWith({
        where: { receiverId: 'user-1', senderId: 'user-2', isRead: false },
        data: expect.any(Object),
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for specific sender', async () => {
      _prisma.message.count.mockResolvedValue(5);
      const result = await new ChatService().getUnreadCount('user-1', 'user-2');
      expect(result).toBe(5);
      expect(_prisma.message.count).toHaveBeenCalledWith({
        where: { receiverId: 'user-1', senderId: 'user-2', isRead: false },
      });
    });

    it('should return unread count for all senders', async () => {
      _prisma.message.count.mockResolvedValue(10);
      const result = await new ChatService().getUnreadCount('user-1');
      expect(result).toBe(10);
      expect(_prisma.message.count).toHaveBeenCalledWith({
        where: { receiverId: 'user-1', isRead: false },
      });
    });
  });

  describe('sendGroupMessage', () => {
    it('should send group message to all members', async () => {
      const message = {
        id: 'msg-123',
        groupId: 'group-1',
        senderId: 'user-1',
        content: 'Hello group!',
        type: 'text',
        replyToId: null,
        createdAt: new Date(),
        sender: { id: 'user-1', username: 'alice', nickname: 'Alice', avatar: null },
        replyTo: null,
      };
      _prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'group-1' });
      _prisma.groupMessage.create.mockResolvedValue(message);
      _prisma.groupMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);
      const result = await new ChatService().sendGroupMessage('user-1', 'group-1', 'Hello group!');
      expect(result).toEqual(message);
      expect(wsManager.sendToUser).toHaveBeenCalledWith('user-2', expect.any(Object));
      expect(wsManager.sendToUser).toHaveBeenCalledWith('user-3', expect.any(Object));
      expect(wsManager.sendToUser).not.toHaveBeenCalledWith('user-1', expect.any(Object));
    });

    it('should throw error if user is not a group member', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      await expect(
        new ChatService().sendGroupMessage('user-1', 'group-1', 'Hello'),
      ).rejects.toThrow('Not a group member');
    });

    it('should include replyToId when provided', async () => {
      const message = {
        id: 'msg-123',
        groupId: 'group-1',
        senderId: 'user-1',
        content: 'Reply',
        type: 'text',
        replyToId: 'msg-456',
        sender: { username: 'alice' },
        replyTo: { id: 'msg-456', content: 'Original', sender: { username: 'prev' } },
      };
      _prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'group-1' });
      _prisma.groupMessage.create.mockResolvedValue(message);
      _prisma.groupMember.findMany.mockResolvedValue([{ userId: 'user-2' }]);
      await new ChatService().sendGroupMessage('user-1', 'group-1', 'Reply', 'text', 'msg-456');
      expect(_prisma.groupMessage.create).toHaveBeenCalledWith({
        data: {
          groupId: 'group-1',
          senderId: 'user-1',
          content: 'Reply',
          type: 'text',
          replyToId: 'msg-456',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('getGroupChatHistory', () => {
    it('should return group chat history', async () => {
      const messages = [
        {
          id: 'msg-1',
          groupId: 'group-1',
          senderId: 'user-1',
          content: 'Hello group',
          type: 'text',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          sender: { id: 'user-1', username: 'alice', nickname: 'Alice', avatar: null },
          replyTo: null,
        },
      ];
      _prisma.groupMember.findFirst.mockResolvedValue({ groupId: 'group-1', userId: 'user-2' });
      _prisma.groupMessage.findMany.mockResolvedValue(messages);
      const result = await new ChatService().getGroupChatHistory('group-1', 50);
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should throw error if not a group member', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      await expect(new ChatService().getGroupChatHistory('group-1', 50)).rejects.toThrow(
        'Not a group member',
      );
    });

    it('should support pagination with before cursor', async () => {
      const messages = [
        {
          id: 'msg-1',
          groupId: 'group-1',
          senderId: 'user-1',
          content: 'Older',
          type: 'text',
          createdAt: new Date('2024-01-01T09:00:00Z'),
          sender: { username: 'alice', nickname: null, avatar: null },
          replyTo: null,
        },
      ];
      _prisma.groupMember.findFirst.mockResolvedValue({ groupId: 'group-1', userId: 'user-2' });
      _prisma.groupMessage.findMany.mockResolvedValue(messages);
      await new ChatService().getGroupChatHistory('group-1', 50, '2024-01-01T10:00:00Z');
      expect(_prisma.groupMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: '2024-01-01T10:00:00Z' },
          }),
        }),
      );
    });

    it('should return hasMore when more than limit', async () => {
      const messages = Array.from({ length: 51 }, (_, i) => ({
        id: `msg-${i}`,
        groupId: 'group-1',
        senderId: 'user-1',
        content: `Message ${i}`,
        type: 'text',
        createdAt: new Date(Date.now() - i * 60000),
        sender: { id: 'user-1', username: 'alice', nickname: null, avatar: null },
        replyTo: null,
      }));
      _prisma.groupMember.findFirst.mockResolvedValue({ groupId: 'group-1', userId: 'user-2' });
      _prisma.groupMessage.findMany.mockResolvedValue(messages);
      const result = await new ChatService().getGroupChatHistory('group-1', 50);
      expect(result.data).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });
});
