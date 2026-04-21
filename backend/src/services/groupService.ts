import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GroupService {
  /**
   * 创建群组
   */
  async createGroup(ownerId: string, data: { name: string; description?: string; isPublic?: boolean; initialMemberIds?: string[] }) {
    const { name, description, isPublic = false, initialMemberIds = [] } = data;

    // 生成邀请码 (仅私密群)
    let inviteCode: string | undefined;
    if (!isPublic) {
      inviteCode = this.generateInviteCode();
    }

    // 创建群组
    const group = await prisma.group.create({
      data: {
        name,
        description,
        isPublic,
        inviteCode,
        ownerId,
        maxMembers: 100,
      },
    });

    // 创建者加入为 OWNER
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: ownerId,
        role: 'OWNER',
      },
    });

    // 添加初始成员
    for (const memberId of initialMemberIds) {
      if (memberId !== ownerId) {
        try {
          await prisma.groupMember.create({
            data: {
              groupId: group.id,
              userId: memberId,
              role: 'MEMBER',
            },
          });
        } catch (e) {
          // 忽略重复或无效成员
        }
      }
    }

    // 返回完整群组信息
    return this.getGroupById(group.id, ownerId);
  }

  /**
   * 生成邀请码 (8位字母数字)
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 获取群组详情
   */
  async getGroupById(groupId: string, viewerId: string | null = null) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
        members: {
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
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // 检查访问权限 (非公开群需要是成员)
    if (!group.isPublic && viewerId) {
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: viewerId },
      });
      if (!membership) {
        throw new Error('Access denied');
      }
    }

    // 格式化成员列表
    const formattedMembers = group.members.map(m => ({
      userId: m.user.id,
      username: m.user.username,
      nickname: m.user.nickname,
      avatar: m.user.avatar,
      isOnline: m.user.isOnline,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      owner: group.owner,
      avatar: group.avatar,
      isPublic: group.isPublic,
      inviteCode: group.inviteCode,
      maxMembers: group.maxMembers,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      myRole: viewerId ? (await this.getUserRoleInGroup(groupId, viewerId)) : null,
      memberCount: formattedMembers.length,
      members: formattedMembers,
    };
  }

  /**
   * 获取用户在某群的角色
   */
  private async getUserRoleInGroup(groupId: string, userId: string): Promise<string | null> {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });
    return member?.role || null;
  }

  /**
   * 获取用户加入的群组列表
   */
  async getMyGroups(userId: string) {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    const groups = await prisma.group.findMany({
      where: { isPublic: true },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return await Promise.all(
      groups.map(async (g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        owner: g.owner,
        avatar: g.avatar,
        isPublic: g.isPublic,
        inviteCode: g.inviteCode,
        maxMembers: g.maxMembers,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        memberCount: await prisma.groupMember.count({ where: { groupId: g.id } }),
      }))
    );
  }

  /**
   * 获取公开群组
   */
  async getPublicGroups() {
    const groups = await prisma.group.findMany({
      where: { isPublic: true },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return await Promise.all(
      groups.map(async (g) => ({
        ...g,
        memberCount: await prisma.groupMember.count({ where: { groupId: g.id } }),
      }))
    );
  }

  /**
   * 邀请成员
   */
  async inviteMember(groupId: string, inviterId: string, targetUserId: string) {
    // 验证权限: inviter 必须是 ADMIN 或 OWNER
    const inviterMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: inviterId },
    });

    if (!inviterMembership || !['OWNER', 'ADMIN'].includes(inviterMembership.role)) {
      throw new Error('Not authorized to invite');
    }

    // 检查是否已在群中
    const existing = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId },
    });

    if (existing) {
      throw new Error('User already in group');
    }

    // 检查人数限制
    const memberCount = await prisma.groupMember.count({ where: { groupId } });
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (memberCount >= group!.maxMembers) {
      throw new Error('Group is full');
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: targetUserId,
        role: 'MEMBER',
      },
    });

    return { success: true, message: 'Invitation sent' };
  }

  /**
   * 使用邀请码加入群组
   */
  async joinWithInviteCode(userId: string, inviteCode: string) {
    const group = await prisma.group.findFirst({
      where: { inviteCode },
    });

    if (!group) {
      throw new Error('Invalid invite code');
    }

    // 检查是否已加入
    const existing = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId },
    });

    if (existing) {
      throw new Error('Already a member');
    }

    // 人数限制检查
    const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
    if (memberCount >= group.maxMembers) {
      throw new Error('Group is full');
    }

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'MEMBER',
      },
    });

    return {
      groupId: group.id,
      groupName: group.name,
      role: 'MEMBER',
    };
  }

  /**
   * 修改成员角色
   */
  async updateMemberRole(groupId: string, actorId: string, targetUserId: string, action: 'promote' | 'demote' | 'kick') {
    // 查询操作者角色
    const actor = await prisma.groupMember.findFirst({
      where: { groupId, userId: actorId },
    });

    if (!actor || !['OWNER', 'ADMIN'].includes(actor.role)) {
      throw new Error('Not authorized');
    }

    // 目标成员
    const target = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId },
    });

    if (!target) {
      throw new Error('Member not found');
    }

    // 不能操作自己
    if (targetUserId === actorId) {
      throw new Error('Cannot modify self');
    }

    // 管理员不能动其他管理员或群主
    if (actor.role === 'ADMIN') {
      if (target.role !== 'MEMBER') {
        throw new Error('Admins cannot modify other admins or owner');
      }
    }

    if (action === 'kick') {
      await prisma.groupMember.delete({
        where: { id: target.id },
      });
      return { success: true, message: 'Member kicked' };
    }

    const newRole = action === 'promote' ? 'ADMIN' : 'MEMBER';
    await prisma.groupMember.update({
      where: { id: target.id },
      data: { role: newRole },
    });

    return { success: true, message: `Member ${action}d to ${newRole}` };
  }
}