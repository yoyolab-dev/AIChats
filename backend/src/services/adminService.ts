import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminService {
  /**
   * 封禁用户
   */
  async banUser(adminId: string, targetUserId: string, reason?: string) {
    // 验证管理员权限
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    if (adminId === targetUserId) {
      throw new Error('Cannot ban self');
    }

    // 封禁用户
    await prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: true },
    });

    return { success: true, message: 'User banned' };
  }

  /**
   * 解禁用户
   */
  async unbanUser(adminId: string, targetUserId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: false },
    });

    return { success: true, message: 'User unbanned' };
  }

  /**
   * 删除任意消息 (私聊/群聊)
   */
  async deleteMessage(adminId: string, messageId: string, reason?: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // 查找消息 (私聊或群聊)
    const privateMsg = await prisma.message.findUnique({ where: { id: messageId } });
    if (privateMsg) {
      await prisma.message.delete({ where: { id: messageId } });
      return { success: true, message: 'Private message deleted' };
    }

    const groupMsg = await prisma.groupMessage.findUnique({ where: { id: messageId } });
    if (groupMsg) {
      await prisma.groupMessage.delete({ where: { id: messageId } });
      return { success: true, message: 'Group message deleted' };
    }

    throw new Error('Message not found');
  }

  /**
   * 获取系统统计信息
   */
  async getStats() {
    const [userCount, groupCount, messageCount, privateMsgCount, groupMsgCount, onlineUserCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.group.count(),
        prisma.message.count(),
        prisma.groupMessage.count(),
        prisma.message.count(),
        prisma.user.count({ where: { isOnline: true } }),
      ]);

    return {
      users: userCount,
      groups: groupCount,
      totalMessages: messageCount + privateMsgCount,
      onlineUsers: onlineUserCount,
    };
  }
}
