import { PrismaClient } from '@prisma/client';
import { wsManager } from './wsManager';

const prisma = new PrismaClient();

export class ChatService {
  /**
   * 获取私聊历史消息（游标分页）
   * @param currentUserId 当前用户ID
   * @param friendId 好友ID
   * @param limit 每页数量 (默认50)
   * @param before 拉取此时间之前的消息 (ISO 8601)
   */
  async getPrivateChatHistory(currentUserId: string, friendId: string, limit: number = 50, before?: string) {
    // 1. 校验好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: friendId },
          { userId: friendId, friendId: currentUserId },
        ],
        status: 'ACCEPTED',
      },
    });

    if (!friendship) {
      throw new Error('Not friends');
    }

    // 2. 构建查询条件
    const where: any = {
      OR: [
        { senderId: currentUserId, receiverId: friendId },
        { senderId: friendId, receiverId: currentUserId },
      ],
    };

    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    // 3. 查询消息（按 createdAt 倒序）
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { username: true, nickname: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // 多取一个判断 hasMore
    });

    // 4. 处理分页
    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // 反转回正序（前端显示用）
    resultMessages.reverse();

    return {
      messages: resultMessages,
      hasMore,
      friend: {
        id: friendId,
      },
    };
  }

  /**
   * 发送私聊消息
   */
  async sendPrivateMessage(senderId: string, receiverId: string, content: string, type: string = 'text', replyToId?: string) {
    // 校验好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId },
        ],
        status: 'ACCEPTED',
      },
    });

    if (!friendship) {
      throw new Error('Cannot send message to non-friend');
    }

    // 检查是否被屏蔽
    if (friendship.status === 'BLOCKED') {
      throw new Error('Cannot send message: blocked');
    }

    // 内容长度限制
    if (content.length > 5000) {
      throw new Error('Message content exceeds 5000 characters');
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        type,
        ...(replyToId && { replyToId }),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { username: true, nickname: true },
            },
          },
        },
      },
    });

    // WebSocket 推送消息给接收者
    wsManager.sendToUser(receiverId, {
      type: 'message',
      payload: {
        message,
        chatType: 'private',
        targetId: senderId,
      },
    });

    return message;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(userId: string, friendId: string, messageIds?: string[]) {
    const where: any = {
      receiverId: userId,
      senderId: friendId,
      isRead: false,
    };

    if (messageIds && messageIds.length > 0) {
      where.id = { in: messageIds };
    }

    const result = await prisma.message.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(userId: string, senderId?: string) {
    const where: any = {
      receiverId: userId,
      isRead: false,
    };

    if (senderId) {
      where.senderId = senderId;
    }

    const count = await prisma.message.count({ where });
    return count;
  }

  /**
   * 发送群聊消息
   */
  async sendGroupMessage(senderId: string, groupId: string, content: string, type: string = 'text', replyToId?: string) {
    // 验证用户是群成员
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: senderId },
    });
    if (!membership) {
      throw new Error('Not a group member');
    }

    // 创建消息
    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId,
        content,
        type,
        ...(replyToId && { replyToId }),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { username: true, nickname: true },
            },
          },
        },
      },
    });

    // WS 广播给群成员 (排除发送者)
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = groupMembers.map(m => m.userId).filter(id => id !== senderId);

    const payload = {
      type: 'group_message',
      payload: { message, groupId },
    };
    for (const id of memberIds) {
      wsManager.sendToUser(id, payload);
    }

    return message;
  }

  /**
   * 获取群聊消息历史
   */
  async getGroupChatHistory(groupId: string, limit: number = 50, before?: string) {
    // 验证用户是群成员
    const membership = await prisma.groupMember.findFirst({
      where: { groupId },
    });
    if (!membership) {
      throw new Error('Not a group member');
    }

    const where: any = { groupId };
    if (before) {
      where.createdAt = { lt: before };
    }

    const messages = await prisma.groupMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { username: true, nickname: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit);

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : null,
    };
  }
}