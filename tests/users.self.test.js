import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('User Self API', () => {
  let userKey, userId;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;

    const hash = await bcrypt.hash('user-key', 10);
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        apiKeyHash: hash,
        isAdmin: false,
        status: 'active',
        displayName: 'Test User'
      }
    });
    userId = user.id;
    userKey = 'user-key';
  });

  describe('GET /api/v1/users/:id', () => {
    it('allows self to fetch own profile', async () => {
      const res = await request(server)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('testuser');
    });

    it('forbids accessing other users', async () => {
      // Create another user
      const otherHash = await bcrypt.hash('other-key', 10);
      const other = await prisma.user.create({
        data: {
          username: 'otheruser',
          apiKeyHash: otherHash,
          isAdmin: false,
          status: 'active'
        }
      });
      const res = await request(server)
        .get(`/api/v1/users/${other.id}`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('updates own displayName', async () => {
      const res = await request(server)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userKey}`)
        .send({ displayName: 'New Name' })
        .expect(200);
      expect(res.body.data.displayName).toBe('New Name');
    });

    it('forbids updating other users', async () => {
      const otherHash = await bcrypt.hash('other-key', 10);
      const other = await prisma.user.create({
        data: {
          username: 'otheruser',
          apiKeyHash: otherHash,
          isAdmin: false,
          status: 'active'
        }
      });
      const res = await request(server)
        .put(`/api/v1/users/${other.id}`)
        .set('Authorization', `Bearer ${userKey}`)
        .send({ displayName: 'Hacker' })
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('soft deletes own account', async () => {
      const res = await request(server)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(200);
      expect(res.body.data.deleted).toBe(true);
      // After deletion, token should be invalid
      const get = await request(server)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(401);
      expect(get.body.success).toBe(false);
    });

    it('forbids deleting other users', async () => {
      const otherHash = await bcrypt.hash('other-key', 10);
      const other = await prisma.user.create({
        data: {
          username: 'otheruser',
          apiKeyHash: otherHash,
          isAdmin: false,
          status: 'active'
        }
      });
      const res = await request(server)
        .delete(`/api/v1/users/${other.id}`)
        .set('Authorization', `Bearer ${userKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });
});
