import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Admin API Extended', () => {
  let adminKey, regularKey, adminId, regularId;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;

    // Create admin
    const adminHash = await bcrypt.hash('admin-secret-key', 10);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        apiKeyHash: adminHash,
        isAdmin: true,
        status: 'active',
      },
    });
    adminId = admin.id;
    adminKey = 'admin-secret-key';

    // Create regular user
    const userHash = await bcrypt.hash('user-secret-key', 10);
    const user = await prisma.user.create({
      data: {
        username: 'bob',
        apiKeyHash: userHash,
        isAdmin: false,
        status: 'active',
        displayName: 'Bob',
      },
    });
    regularId = user.id;
    regularKey = 'user-secret-key';
  });

  describe('GET /api/v1/admin/stats', () => {
    it('returns statistics', async () => {
      const res = await request(server)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.users).toBe('number');
      expect(typeof res.body.data.activeUsers).toBe('number');
      expect(typeof res.body.data.messages).toBe('number');
      expect(typeof res.body.data.conversations).toBe('number');
    });

    it('forbids non-admin', async () => {
      const res = await request(server)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${regularKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/logs', () => {
    it('returns paginated logs', async () => {
      const res = await request(server)
        .get('/api/v1/admin/logs')
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('accepts filter query params', async () => {
      // No logs exist but query should be accepted
      const res = await request(server)
        .get('/api/v1/admin/logs?page=1&limit=20')
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });
  });

  describe('GET /api/v1/admin/messages', () => {
    it('lists all messages', async () => {
      const res = await request(server)
        .get('/api/v1/admin/messages')
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by keyword', async () => {
      const res = await request(server)
        .get('/api/v1/admin/messages?keyword=nonexistent')
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('forbids non-admin', async () => {
      const res = await request(server)
        .get('/api/v1/admin/messages')
        .set('Authorization', `Bearer ${regularKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  // We already covered GET /api/v1/admin/users in previous admin tests, but we repeat for completeness here if needed.
});
