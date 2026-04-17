import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';

describe('Conversations API', () => {
  let aliceKey, bobKey, aliceId, bobId;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;

    // Register alice
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

    // Register bob
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
  });

  describe('GET /api/v1/conversations', () => {
    it('returns empty list when none', async () => {
      const res = await request(server)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns conversations after creation', async () => {
      // Create a conversation between alice and bob
      await request(server)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ participantIds: [bobId] })
        .expect(200);

      const res = await request(server)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].participantIds).toContain(aliceId);
      expect(res.body.data[0].participantIds).toContain(bobId);
    });
  });

  describe('POST /api/v1/conversations', () => {
    it('creates conversation with participants', async () => {
      const res = await request(server)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ participantIds: [bobId] })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.participantIds).toContain(aliceId);
      expect(res.body.data.participantIds).toContain(bobId);
    });

    it('allows missing participantIds (creates solo conversation)', async () => {
      const res = await request(server)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({})
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.participantIds).toContain(aliceId);
      expect(res.body.data.participantIds.length).toBe(1);
    });

    it('allows empty participantIds array (creates solo conversation)', async () => {
      const res = await request(server)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ participantIds: [] })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.participantIds).toContain(aliceId);
      expect(res.body.data.participantIds.length).toBe(1);
    });
  });

  describe('GET /api/v1/conversations/:id', () => {
    let convId;
    beforeEach(async () => {
      const create = await request(server)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ participantIds: [bobId] });
      expect(create.body.success).toBe(true);
      convId = create.body.data.id;
    });

    it('returns conversation details for participant', async () => {
      const res = await request(server)
        .get(`/api/v1/conversations/${convId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(convId);
      expect(res.body.data.participantIds).toContain(aliceId);
    });

    it('forbids non-participant', async () => {
      // Create a third user
      const thirdRes = await request(server)
        .post('/api/v1/auth/register')
        .send({ username: 'charlie', email: 'charlie@example.com' });
      const thirdKey = thirdRes.body.data.apiKey;

      const res = await request(server)
        .get(`/api/v1/conversations/${convId}`)
        .set('Authorization', `Bearer ${thirdKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Forbidden');
    });

    it('returns 404 for non-existent conversation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(server)
        .get(`/api/v1/conversations/${fakeId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Conversation not found');
    });
  });

  describe('DELETE /api/v1/conversations/:id', () => {
    let convId;
    beforeEach(async () => {
      const create = await request(server)
        .post('/api/v1/conversations')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ participantIds: [bobId] });
      expect(create.body.success).toBe(true);
      convId = create.body.data.id;
    });

    it('deletes conversation for participant', async () => {
      const del = await request(server)
        .delete(`/api/v1/conversations/${convId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(del.body.success).toBe(true);

      // Verify deletion
      const get = await request(server)
        .get(`/api/v1/conversations/${convId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(404);
      expect(get.body.success).toBe(false);
    });

    it('forbids non-participant', async () => {
      // Create third user
      const thirdRes = await request(server)
        .post('/api/v1/auth/register')
        .send({ username: 'charlie', email: 'charlie@example.com' });
      const thirdKey = thirdRes.body.data.apiKey;

      const res = await request(server)
        .delete(`/api/v1/conversations/${convId}`)
        .set('Authorization', `Bearer ${thirdKey}`)
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Forbidden');
    });

    it('returns 404 for non-existent conversation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(server)
        .delete(`/api/v1/conversations/${fakeId}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Conversation not found');
    });
  });
});
