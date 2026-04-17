import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Admin Friends Management', () => {
  let adminKey, adminId, userKey, userId, otherKey, otherId;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;

    const adminHash = await bcrypt.hash('admin-secret', 10);
    const admin = await prisma.user.create({
      data: { username: 'admin', apiKeyHash: adminHash, isAdmin: true, status: 'active' }
    });
    adminId = admin.id;
    adminKey = 'admin-secret';

    const userHash = await bcrypt.hash('user-key', 10);
    const user = await prisma.user.create({
      data: { username: 'user', apiKeyHash: userHash, isAdmin: false, status: 'active' }
    });
    userId = user.id;
    userKey = 'user-key';

    const otherHash = await bcrypt.hash('other-key', 10);
    const other = await prisma.user.create({
      data: { username: 'other', apiKeyHash: otherHash, isAdmin: false, status: 'active' }
    });
    otherId = other.id;
    otherKey = 'other-key';
  });

  describe('GET /api/v1/admin/users/:userId/friends', () => {
    it('returns 403 for non-admin', async () => {
      const res = await request(server)
        .get(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('returns empty list when user has no friends', async () => {
      const res = await request(server)
        .get(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns friends list', async () => {
      await prisma.friendship.create({
        data: { userId, friendId: otherId, status: 'accepted' }
      });
      const res = await request(server)
        .get(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe('other');
    });

    it('returns 404 if target user not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(server)
        .get(`/api/v1/admin/users/${fakeId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('POST /api/v1/admin/users/:userId/friends', () => {
    it('creates friendship for target user', async () => {
      const res = await request(server)
        .post(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ friendUsername: 'other' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userId);
      expect(res.body.data.friendId).toBe(otherId);
      // Verify persisted
      const count = await prisma.friendship.count({
        where: { userId, friendId: otherId }
      });
      expect(count).toBe(1);
    });

    it('requires friendUsername', async () => {
      const res = await request(server)
        .post(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({})
        .expect(400);
      expect(res.body.error).toBe('friendUsername required');
    });

    it('rejects non-admin', async () => {
      const res = await request(server)
        .post(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${userKey}`)
        .send({ friendUsername: 'other' })
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects self-friending', async () => {
      const res = await request(server)
        .post(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ friendUsername: 'user' })
        .expect(400);
      expect(res.body.error).toBe('Cannot friend yourself');
    });

    it('rejects non-existent friend username', async () => {
      const res = await request(server)
        .post(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ friendUsername: 'nonexistent' })
        .expect(404);
      expect(res.body.error).toBe('Friend user not found');
    });

    it('rejects duplicate friendship', async () => {
      await prisma.friendship.create({
        data: { userId, friendId: otherId, status: 'accepted' }
      });
      const res = await request(server)
        .post(`/api/v1/admin/users/${userId}/friends`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ friendUsername: 'other' })
        .expect(409);
      expect(res.body.error).toBe('Friendship already exists');
    });
  });

  describe('DELETE /api/v1/admin/users/:userId/friends/:friendId', () => {
    beforeEach(async () => {
      await prisma.friendship.create({
        data: { userId, friendId: otherId, status: 'accepted' }
      });
    });

    it('deletes friendship', async () => {
      const res = await request(server)
        .delete(`/api/v1/admin/users/${userId}/friends/${otherId}`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      const count = await prisma.friendship.count({
        where: { userId, friendId: otherId }
      });
      expect(count).toBe(0);
    });

    it('returns 404 if friendship not found', async () => {
      // Delete first to make it not found
      await prisma.friendship.deleteMany({ where: { userId, friendId: otherId } });
      const res = await request(server)
        .delete(`/api/v1/admin/users/${userId}/friends/${otherId}`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Friendship not found');
    });

    it('rejects non-admin', async () => {
      const res = await request(server)
        .delete(`/api/v1/admin/users/${userId}/friends/${otherId}`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 if target user not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(server)
        .delete(`/api/v1/admin/users/${fakeId}/friends/${otherId}`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(404);
      expect(res.body.error).toBe('User not found');
    });
  });
});
