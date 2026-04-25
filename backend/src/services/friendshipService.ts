import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export class FriendshipService {
  /**
   * 发送好友请求
   */
  async sendRequest(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // 检查是否为已存在好友
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new Error('Already friends');
      } else if (existing.status === 'PENDING') {
        throw new Error('Friend request already pending');
      } else if (existing.status === 'BLOCKED') {
        throw new Error('Cannot send request: blocked');
      }
    }

    // 创建好友请求
    const friendship = await prisma.friendship.create({
      data: {
        userId: currentUserId,
        friendId: targetUserId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, username: true, nickname: true, avatar: true, isOnline: true },
        },
        friend: {
          select: { id: true, username: true, nickname: true, avatar: true, isOnline: true },
        },
      },
    });

    return friendship;
  }

  /**
   * 处理好友请求（接受/拒绝/屏蔽）
   */
  async handleRequest(
    friendshipId: string,
    currentUserId: string,
    action: 'accept' | 'reject' | 'block',
  ) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: { user: true, friend: true },
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    // 只能处理发给自己的请求
    if (friendship.friendId !== currentUserId) {
      throw new Error('Not authorized to handle this request');
    }

    let newStatus: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
    if (action === 'accept') {
      newStatus = 'ACCEPTED';
    } else if (action === 'block') {
      newStatus = 'BLOCKED';
    } else {
      newStatus = 'PENDING'; // reject 保持 PENDING 但可视为删除
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: newStatus },
      include: { user: true, friend: true },
    });

    return updated;
  }

  /**
   * 获取好友列表
   */
  async getFriends(userId: string, status: string = 'ACCEPTED') {
    const friendships = await prisma.friendship.findMany({
      where: {
        userId,
        status,
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((f) => ({
      id: f.id,
      friendId: f.friend.id,
      username: f.friend.username,
      nickname: f.friend.nickname,
      avatar: f.friend.avatar,
      isOnline: f.friend.isOnline,
      lastSeenAt: f.friend.lastSeenAt,
      friendship: {
        createdAt: f.createdAt,
        status: f.status,
      },
      isRequester: true,
    }));
  }

  /**
   * 获取收到的好友请求
   */
  async getIncomingRequests(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return friendships.map((f) => ({
      id: f.id,
      userId: f.user.id,
      username: f.user.username,
      nickname: f.user.nickname,
      avatar: f.user.avatar,
      isOnline: f.user.isOnline,
      friendship: {
        createdAt: f.createdAt,
        status: f.status,
      },
      isRequester: false, // 对方是请求方
    }));
  }

  /**
   * 删除好友关系
   */
  async removeFriendship(userId: string, friendId: string) {
    const result = await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return result.count > 0;
  }
}
