jest.mock('@prisma/client', () => {
  const instance = {
    group: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    groupMember: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    groupMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => instance),
  };
});

import { PrismaClient } from '@prisma/client';
import { GroupService } from '@/services/groupService';

const MockPrisma = PrismaClient as jest.Mocked<typeof PrismaClient>;
const prismaInstance = (MockPrisma as any).mock.results[0]?.value;

describe('GroupService', () => {
  let _prisma: any;

  beforeAll(() => {
    _prisma = prismaInstance;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createGroup', () => {
    it('should create a public group', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Test',
        isPublic: true,
        inviteCode: null,
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [],
      };
      _prisma.group.create.mockResolvedValue(mockGroup);
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      _prisma.groupMember.create.mockResolvedValue({} as any);
      _prisma.groupMember.findFirst.mockResolvedValue({
        role: 'OWNER',
        userId: 'u1',
        groupId: 'g-1',
      }); // for getGroupById membership check
      _prisma.groupMember.count.mockResolvedValue(1);
      const result = await new GroupService().createGroup('u1', { name: 'Test', isPublic: true });
      expect(result.id).toBe('g-1');
      expect(result.isPublic).toBe(true);
      expect(_prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPublic: true, maxMembers: 100 }),
        }),
      );
    });

    it('should generate invite code for private group', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Private',
        isPublic: false,
        inviteCode: 'ABC12345',
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [],
      };
      _prisma.group.create.mockResolvedValue(mockGroup);
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      _prisma.groupMember.create.mockResolvedValue({} as any);
      _prisma.groupMember.findFirst.mockResolvedValue({
        role: 'OWNER',
        userId: 'u1',
        groupId: 'g-1',
      });
      _prisma.groupMember.count.mockResolvedValue(1);
      const result = await new GroupService().createGroup('u1', {
        name: 'Private',
        isPublic: false,
      });
      expect(result.inviteCode).toBe('ABC12345');
    });

    it('should add initial members', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Test',
        isPublic: true,
        inviteCode: null,
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [],
      };
      _prisma.group.create.mockResolvedValue(mockGroup);
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      _prisma.groupMember.create.mockResolvedValue({} as any);
      _prisma.groupMember.findFirst.mockResolvedValue({
        role: 'OWNER',
        userId: 'u1',
        groupId: 'g-1',
      });
      _prisma.groupMember.count.mockResolvedValue(2);
      await new GroupService().createGroup('u1', { name: 'Test', initialMemberIds: ['u2', 'u3'] });
      expect(_prisma.groupMember.create).toHaveBeenCalledTimes(3);
    });

    it('should not add owner twice', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Test',
        isPublic: true,
        inviteCode: null,
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [],
      };
      _prisma.group.create.mockResolvedValue(mockGroup);
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      _prisma.groupMember.create.mockResolvedValue({} as any);
      _prisma.groupMember.findFirst.mockResolvedValue({
        role: 'OWNER',
        userId: 'u1',
        groupId: 'g-1',
      });
      _prisma.groupMember.count.mockResolvedValue(1);
      await new GroupService().createGroup('u1', { name: 'Test', initialMemberIds: ['u1', 'u2'] });
      expect(_prisma.groupMember.create).toHaveBeenCalledTimes(2);
    });

    it('should set default maxMembers to 100', async () => {
      const mockGroupResult = {
        id: 'g-1',
        name: 'Test',
        isPublic: false,
        inviteCode: null,
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [],
      };
      _prisma.group.create.mockResolvedValue(mockGroupResult);
      _prisma.group.findUnique.mockResolvedValue(mockGroupResult);
      _prisma.groupMember.create.mockResolvedValue({} as any);
      _prisma.groupMember.findFirst.mockResolvedValue({
        role: 'OWNER',
        userId: 'u1',
        groupId: 'g-1',
      });
      _prisma.groupMember.count.mockResolvedValue(1);
      await new GroupService().createGroup('u1', { name: 'Test' });
      expect(_prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maxMembers: 100 }),
        }),
      );
    });
  });

  describe('getGroupById', () => {
    it('should return group with members', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Test',
        isPublic: true,
        inviteCode: null,
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [
          {
            id: 'gm-1',
            userId: 'u1',
            role: 'OWNER',
            joinedAt: new Date(),
            user: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null, isOnline: true },
          },
        ],
      };
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      const result = await new GroupService().getGroupById('g-1', 'u2');
      expect(result.id).toBe('g-1');
      expect(result.members).toHaveLength(1);
      expect(result.myRole).toBeNull();
    });

    it('should throw error if group not found', async () => {
      _prisma.group.findUnique.mockResolvedValue(null);
      await expect(new GroupService().getGroupById('nonexistent', 'u1')).rejects.toThrow(
        'Group not found',
      );
    });

    it('should restrict private group access', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Private',
        isPublic: false,
        inviteCode: 'CODE',
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice', nickname: 'Alice', avatar: null },
        members: [],
      };
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      await expect(new GroupService().getGroupById('g-1', 'u2')).rejects.toThrow('Access denied');
    });

    it('should allow access to public group', async () => {
      const mockGroup = {
        id: 'g-1',
        name: 'Public',
        isPublic: true,
        inviteCode: null,
        ownerId: 'u1',
        maxMembers: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: 'u1', username: 'alice' },
        members: [],
      };
      _prisma.group.findUnique.mockResolvedValue(mockGroup);
      const result = await new GroupService().getGroupById('g-1', 'u2');
      expect(result).toBeDefined();
    });
  });

  describe('getPublicGroups', () => {
    it('should return public groups with member count', async () => {
      const mockGroups = [
        {
          id: 'g-1',
          name: 'Public',
          isPublic: true,
          owner: { id: 'u1', username: 'alice', nickname: 'Alice' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      _prisma.group.findMany.mockResolvedValue(mockGroups);
      _prisma.groupMember.count.mockResolvedValue(10);
      const result = await new GroupService().getPublicGroups();
      expect(result[0].memberCount).toBe(10);
    });
  });

  describe('getMyGroups', () => {
    it('should return joined groups', async () => {
      const memberships = [
        {
          groupId: 'g-1',
          userId: 'u1',
          role: 'MEMBER',
          joinedAt: new Date(),
          group: {
            id: 'g-1',
            name: 'My Group',
            isPublic: true,
            owner: { id: 'u2', username: 'bob', nickname: 'Bob' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];
      _prisma.groupMember.findMany.mockResolvedValue(memberships);
      const publicGroups = [
        {
          id: 'g-1',
          name: 'My Group',
          isPublic: true,
          inviteCode: null,
          ownerId: 'u2',
          owner: { id: 'u2', username: 'bob', nickname: 'Bob' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      _prisma.group.findMany.mockResolvedValue(publicGroups);
      _prisma.groupMember.count.mockResolvedValue(5);
      const result = await new GroupService().getMyGroups('u1');
      expect(result[0].memberCount).toBe(5);
    });
  });

  describe('inviteMember', () => {
    it('should allow OWNER to invite', async () => {
      _prisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: 'gm-1', role: 'OWNER' })
        .mockResolvedValueOnce(null);
      _prisma.groupMember.count.mockResolvedValue(5);
      _prisma.group.findUnique.mockResolvedValue({ maxMembers: 10 } as any);
      _prisma.groupMember.create.mockResolvedValue({} as any);
      await new GroupService().inviteMember('g-1', 'u1', 'u2');
      expect(_prisma.groupMember.create).toHaveBeenCalledWith({
        data: { groupId: 'g-1', userId: 'u2', role: 'MEMBER' },
      });
    });

    it('should reject MEMBER', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue({ id: 'gm-1', role: 'MEMBER' });
      await expect(new GroupService().inviteMember('g-1', 'u1', 'u2')).rejects.toThrow(
        'Not authorized to invite',
      );
    });

    it('should throw if user already in group', async () => {
      _prisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: 'gm-1', role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'gm-2' });
      await expect(new GroupService().inviteMember('g-1', 'u1', 'u2')).rejects.toThrow(
        'User already in group',
      );
    });

    it('should throw if group is full', async () => {
      _prisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: 'gm-1', role: 'OWNER' })
        .mockResolvedValueOnce(null);
      _prisma.groupMember.count.mockResolvedValue(10);
      _prisma.group.findUnique.mockResolvedValue({ maxMembers: 10 } as any);
      await expect(new GroupService().inviteMember('g-1', 'u1', 'u2')).rejects.toThrow(
        'Group is full',
      );
    });
  });

  describe('joinWithInviteCode', () => {
    it('should join with valid code', async () => {
      const mockGroup = { id: 'g-1', name: 'Test', inviteCode: 'CODE', maxMembers: 100 };
      _prisma.group.findFirst.mockResolvedValue(mockGroup);
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      _prisma.groupMember.count.mockResolvedValue(5);
      _prisma.groupMember.create.mockResolvedValue({
        groupId: 'g-1',
        userId: 'u1',
        role: 'MEMBER',
      } as any);
      const result = await new GroupService().joinWithInviteCode('u1', 'CODE');
      expect(result).toMatchObject({ groupId: 'g-1', groupName: 'Test', role: 'MEMBER' });
    });

    it('should throw for invalid code', async () => {
      _prisma.group.findFirst.mockResolvedValue(null);
      await expect(new GroupService().joinWithInviteCode('u1', 'INVALID')).rejects.toThrow(
        'Invalid invite code',
      );
    });

    it('should throw if already a member', async () => {
      _prisma.group.findFirst.mockResolvedValue({
        id: 'g-1',
        name: 'Test',
        inviteCode: 'CODE',
      } as any);
      _prisma.groupMember.findFirst.mockResolvedValue({ id: 'gm-1' });
      await expect(new GroupService().joinWithInviteCode('u1', 'CODE')).rejects.toThrow(
        'Already a member',
      );
    });

    it('should throw if group is full', async () => {
      _prisma.group.findFirst.mockResolvedValue({
        id: 'g-1',
        name: 'Test',
        inviteCode: 'CODE',
        maxMembers: 10,
      } as any);
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      _prisma.groupMember.count.mockResolvedValue(10);
      await expect(new GroupService().joinWithInviteCode('u1', 'CODE')).rejects.toThrow(
        'Group is full',
      );
    });
  });

  describe('updateMemberRole', () => {
    it('should promote member', async () => {
      const actor = { id: 'gm-1', role: 'OWNER' };
      const target = { id: 'gm-2', userId: 'u2', role: 'MEMBER' };
      _prisma.groupMember.findFirst.mockResolvedValueOnce(actor).mockResolvedValueOnce(target);
      _prisma.groupMember.update.mockResolvedValue({ ...target, role: 'ADMIN' } as any);
      const result = await new GroupService().updateMemberRole('g-1', 'u1', 'u2', 'promote');
      expect(result.message).toContain('promoted');
    });

    it('should kick member', async () => {
      const actor = { id: 'gm-1', role: 'OWNER' };
      const target = { id: 'gm-2', userId: 'u2', role: 'MEMBER' };
      _prisma.groupMember.findFirst.mockResolvedValueOnce(actor).mockResolvedValueOnce(target);
      _prisma.groupMember.delete.mockResolvedValue({} as any);
      const result = await new GroupService().updateMemberRole('g-1', 'u1', 'u2', 'kick');
      expect(result.message).toContain('kicked');
    });

    it('should reject unauthorized actor', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue({ id: 'gm-1', role: 'MEMBER' });
      await expect(
        new GroupService().updateMemberRole('g-1', 'u1', 'u2', 'promote'),
      ).rejects.toThrow('Not authorized');
    });

    it('should throw if target not found', async () => {
      _prisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: 'gm-1', role: 'OWNER' })
        .mockResolvedValueOnce(null);
      await expect(
        new GroupService().updateMemberRole('g-1', 'u1', 'u2', 'promote'),
      ).rejects.toThrow('Member not found');
    });

    it('should not allow self modification', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue({ id: 'gm-1', userId: 'u1', role: 'OWNER' });
      await expect(new GroupService().updateMemberRole('g-1', 'u1', 'u1', 'kick')).rejects.toThrow(
        'Cannot modify self',
      );
    });

    it('should prevent ADMIN from modifying other ADMIN/OWNER', async () => {
      _prisma.groupMember.findFirst
        .mockResolvedValueOnce({ id: 'gm-1', userId: 'u1', role: 'ADMIN' })
        .mockResolvedValueOnce({ id: 'gm-2', userId: 'u2', role: 'ADMIN' });
      await expect(
        new GroupService().updateMemberRole('g-1', 'u1', 'u2', 'promote'),
      ).rejects.toThrow('Admins cannot modify other admins or owner');
    });

    it('should allow ADMIN to demote MEMBER', async () => {
      const actor = { id: 'gm-1', userId: 'u1', role: 'ADMIN' };
      const target = { id: 'gm-2', userId: 'u2', role: 'MEMBER' };
      _prisma.groupMember.findFirst.mockResolvedValueOnce(actor).mockResolvedValueOnce(target);
      _prisma.groupMember.update.mockResolvedValue({ ...target, role: 'MEMBER' } as any);
      const result = await new GroupService().updateMemberRole('g-1', 'u1', 'u2', 'demote');
      expect(result.message).toContain('demoted');
    });
  });

  describe('dismissGroup', () => {
    it('should allow OWNER to dismiss', async () => {
      const membership = { id: 'gm-1', userId: 'u1', role: 'OWNER', groupId: 'g-1' };
      _prisma.groupMember.findFirst.mockResolvedValue(membership);
      _prisma.groupMessage.deleteMany.mockResolvedValue({} as any);
      _prisma.groupMember.deleteMany.mockResolvedValue({} as any);
      _prisma.group.delete.mockResolvedValue({} as any);
      const result = await new GroupService().dismissGroup('g-1', 'u1');
      expect(result.success).toBe(true);
      expect(_prisma.group.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } });
    });

    it('should throw if not OWNER', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue({ id: 'gm-1', userId: 'u2', role: 'MEMBER' });
      await expect(new GroupService().dismissGroup('g-1', 'u2')).rejects.toThrow(
        'Only owner can dismiss the group',
      );
    });

    it('should throw if not a member', async () => {
      _prisma.groupMember.findFirst.mockResolvedValue(null);
      await expect(new GroupService().dismissGroup('g-1', 'u1')).rejects.toThrow(
        'Only owner can dismiss the group',
      );
    });
  });
});
