import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Messages API', () => {
  let aliceKey, bobKey, aliceId, bobId, convId;
  let adminKey, adminId;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;

    // Create admin for privilege tests
    const adminHash = await bcrypt.hash('admin-secret', 10);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        apiKeyHash: adminHash,
        isAdmin: true,
        status: 'active'
      }
    });
    adminId = admin.id;
    adminKey = 'admin-secret';

    // Register alice and bob
    const aliceRes = await request(server)
      .post('/api/v1/auth/register')
      .send({ username: 'alice', email: 'alice@example.com' });
    expect(aliceRes.body.success).toBe(true);
    aliceKey = aliceRes.body.data.apiKey;
    const aliceMe = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceKey}`)
      .expect(200);
    aliceId = aliceMe.body.data.id;

    const bobRes = await request(server)
      .post('/api/v1/auth/register')
      .send({ username: 'bob', email: 'bob@example.com' });
    expect(bobRes.body.success).toBe(true);
    bobKey = bobRes.body.data.apiKey;
    const bobMe = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${bobKey}`)
      .expect(200);
    bobId = bobMe.body.data.id;

    // Create conversation between alice and bob
    const convRes = await request(server)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${aliceKey}`)
      .send({ participantIds: [bobId] });
    expect(convRes.body.success).toBe(true);
    convId = convRes.body.data.id;
  });

  describe('POST /api/v1/conversations/:id/messages', () => {
    it('creates a message', async () => {
      const res = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'Hello, world!' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Hello, world!');
      expect(res.body.data.senderId).toBe(aliceId);
      expect(res.body.data.contentHtml).toContain('<p>Hello, world!</p>');
    });

    it('requires content', async () => {
      const res = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('content required');
    });

    it('rejects non-participant', async () => {
      const thirdRes = await request(server)
        .post('/api/v1/auth/register')
        .send({ username: 'charlie', email: 'charlie@example.com' });
      const thirdKey = thirdRes.body.data.apiKey;
      const res = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${thirdKey}`)
        .send({ content: 'Hi' })
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('GET /api/v1/conversations/:id/messages', () => {
    beforeEach(async () => {
      // Create some messages
      await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'First' });
      await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ content: 'Second' });
    });

    it('lists messages', async () => {
      const res = await request(server)
        .get(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      // messages sorted ascending after reverse
      expect(res.body.data[0].content).toBe('First');
      expect(res.body.data[1].content).toBe('Second');
    });

    it('applies limit and offset', async () => {
      const res = await request(server)
        .get(`/api/v1/conversations/${convId}/messages?limit=1`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.limit).toBe(1);
    });
  });

  describe('PUT /api/v1/messages/:id', () => {
    let msgId;
    beforeEach(async () => {
      const msgRes = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'Original' });
      msgId = msgRes.body.data.id;
    });

    it('updates own message', async () => {
      const res = await request(server)
        .put(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'Edited' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Edited');
      expect(res.body.data.isEdited).toBe(true);
    });

    it('forbids editing others message', async () => {
      const res = await request(server)
        .put(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ content: 'Hacked' })
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('requires content', async () => {
      const res = await request(server)
        .put(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({})
        .expect(400);
      expect(res.body.error).toBe('content required');
    });
  });

  describe('DELETE /api/v1/messages/:id', () => {
    let msgId;
    beforeEach(async () => {
      const msgRes = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'Will delete' });
      msgId = msgRes.body.data.id;
    });

    it('deletes own message', async () => {
      const res = await request(server)
        .delete(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      // Verify soft delete
      const get = await request(server)
        .get(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(404);
    });

    it('forbids deleting others message', async () => {
      const res = await request(server)
        .delete(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${bobKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/messages/:id/read', () => {
    let msgId;
    beforeEach(async () => {
      const msgRes = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'Unread' });
      msgId = msgRes.body.data.id;
    });

    it('marks message as read', async () => {
      const res = await request(server)
        .post(`/api/v1/messages/${msgId}/read`)
        .set('Authorization', `Bearer ${bobKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Admin actions', () => {
    let msgId;
    beforeEach(async () => {
      const msgRes = await request(server)
        .post(`/api/v1/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ content: 'Admin test message' });
      msgId = msgRes.body.data.id;
    });

    it('admin can edit others message', async () => {
      const res = await request(server)
        .put(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${adminKey}`)
        .send({ content: 'Edited by admin' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Edited by admin');
      expect(res.body.data.isEdited).toBe(true);
    });

    it('admin can delete others message', async () => {
      const res = await request(server)
        .delete(`/api/v1/messages/${msgId}`)
        .set('Authorization', `Bearer ${adminKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });
});
