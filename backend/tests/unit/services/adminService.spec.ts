jest.mock('@prisma/client', () => {
  const instance = {
    user: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    message: { findUnique: jest.fn(), delete: jest.fn(), count: jest.fn() },
    groupMessage: { findUnique: jest.fn(), delete: jest.fn(), count: jest.fn() },
    group: { count: jest.fn() },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => instance),
  };
});

import { PrismaClient } from '@prisma/client';
import { AdminService } from '@/services/adminService';

const MockPrisma = PrismaClient as jest.Mocked<typeof PrismaClient>;
const prismaInstance = (MockPrisma as any).mock.results[0]?.value;

describe('AdminService', () => {
  let _prisma: any;

  beforeAll(() => {
    _prisma = prismaInstance;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      _prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' }) // admin check
        .mockResolvedValueOnce({ id: 'user-2', role: 'USER' }); // target check

      const result = await new AdminService().banUser('admin-1', 'user-2', 'Test reason');

      expect(result.success).toBe(true);
      expect(_prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-2' }, data: { isBanned: true } });
    });

    it('should throw error if admin does not exist', async () => {
      _prisma.user.findUnique.mockResolvedValueOnce(null); // admin not found
      await expect(new AdminService().banUser('admin-1', 'user-2')).rejects.toThrow('Unauthorized');
    });

    it('should throw error if user is not ADMIN', async () => {
      _prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: 'USER' }) // admin has wrong role
        .mockResolvedValueOnce({ id: 'user-2', role: 'USER' });
      await expect(new AdminService().banUser('admin-1', 'user-2')).rejects.toThrow('Unauthorized');
    });

    it('should throw error if trying to ban self', async () => {
      _prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
      await expect(new AdminService().banUser('admin-1', 'admin-1')).rejects.toThrow('Cannot ban self');
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      _prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
        .mockResolvedValueOnce({ id: 'user-2', role: 'USER' });

      const result = await new AdminService().unbanUser('admin-1', 'user-2');

      expect(result.success).toBe(true);
      expect(_prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-2' }, data: { isBanned: false } });
    });

    it('should throw error if not admin', async () => {
      _prisma.user.findUnique.mockResolvedValueOnce({ id: 'admin-1', role: 'USER' });
      // Second call would be target user; but since first throws, second won't be reached
      await expect(new AdminService().unbanUser('admin-1', 'user-2')).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteMessage', () => {
    it('should delete private message', async () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const privateMsg = { id: 'msg-123', senderId: 'user-2' };

      _prisma.user.findUnique.mockResolvedValue(admin);
      _prisma.message.findUnique.mockResolvedValue(privateMsg);
      _prisma.message.delete.mockResolvedValue({} as any);

      const result = await new AdminService().deleteMessage('admin-1', 'msg-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Private message deleted');
      expect(_prisma.message.delete).toHaveBeenCalledWith({ where: { id: 'msg-123' } });
    });

    it('should delete group message', async () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const groupMsg = { id: 'msg-123', senderId: 'user-2' };

      _prisma.user.findUnique.mockResolvedValue(admin);
      _prisma.message.findUnique.mockResolvedValue(null); // no private message
      _prisma.groupMessage.findUnique.mockResolvedValue(groupMsg);
      _prisma.groupMessage.delete.mockResolvedValue({} as any);

      const result = await new AdminService().deleteMessage('admin-1', 'msg-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Group message deleted');
      expect(_prisma.groupMessage.delete).toHaveBeenCalledWith({ where: { id: 'msg-123' } });
    });

    it('should throw error if message not found', async () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };

      _prisma.user.findUnique.mockResolvedValue(admin);
      _prisma.message.findUnique.mockResolvedValue(null);
      _prisma.groupMessage.findUnique.mockResolvedValue(null);

      await expect(new AdminService().deleteMessage('admin-1', 'nonexistent')).rejects.toThrow('Message not found');
    });

    it('should throw error if not admin', async () => {
      _prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'USER' });
      _prisma.message.findUnique.mockResolvedValue({} as any);
      await expect(new AdminService().deleteMessage('admin-1', 'msg-123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getStats', () => {
    it('should return system statistics', async () => {
      // user.count (1)
      // group.count (1)
      // message.count (1 for messageCount)
      // groupMessage.count (1 for privateMsgCount)
      // message.count (1 second, unused)
      // user.count({ where: { isOnline: true } }) (1)
      _prisma.user.count
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(50); // online users
      _prisma.group.count.mockResolvedValue(10);
      _prisma.message.count
        .mockResolvedValueOnce(1000) // messageCount (first call)
        .mockResolvedValueOnce(0);    // second call (unused)
      _prisma.groupMessage.count.mockResolvedValue(2000); // privateMsgCount

      const stats = await new AdminService().getStats();

      expect(stats).toEqual({ users: 100, groups: 10, totalMessages: 3000, onlineUsers: 50 });
    });

    it('should count messages correctly (500 + 300 = 800)', async () => {
      _prisma.user.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(20);
      _prisma.group.count.mockResolvedValue(5);
      _prisma.message.count
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(0);
      _prisma.groupMessage.count.mockResolvedValue(300);

      const stats = await new AdminService().getStats();

      expect(stats.totalMessages).toBe(800);
    });
  });
});
