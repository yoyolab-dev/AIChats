import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';

describe('Friendships API', () => {
  let aliceKey, bobKey, charlieKey, aliceId, bobId;

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;

    // Register alice
    const alice = await request(server)
      .post('/api/v1/auth/register')
      .send({ username: 'alice', email: 'alice@example.com' });
    expect(alice.body.success).toBe(true);
    aliceKey = alice.body.data.apiKey;
    const aliceMe = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceKey}`)
      .expect(200);
    aliceId = aliceMe.body.data.id;

    // Register bob
    const bob = await request(server)
      .post('/api/v1/auth/register')
      .send({ username: 'bob', email: 'bob@example.com' });
    expect(bob.body.success).toBe(true);
    bobKey = bob.body.data.apiKey;
    const bobMe = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${bobKey}`)
      .expect(200);
    bobId = bobMe.body.data.id;

    // Register charlie
    const charlie = await request(server)
      .post('/api/v1/auth/register')
      .send({ username: 'charlie', email: 'charlie@example.com' });
    expect(charlie.body.success).toBe(true);
    charlieKey = charlie.body.data.apiKey;
  });

  describe('GET /api/v1/users/me/friends', () => {
    it('returns empty list initially', async () => {
      const res = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/users/me/friends', () => {
    it('creates friendship with valid friendUsername', async () => {
      const res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.friendId).toBe(bobId);
      expect(res.body.data.status).toBe('accepted');
    });

    it('requires friendUsername', async () => {
      const res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('friendUsername required');
    });

    it('returns 404 if friend user not found', async () => {
      const res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'nonexistent' })
        .expect(404);
      expect(res.body.error).toBe('User not found');
    });

    it('cannot friend yourself', async () => {
      const res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'alice' })
        .expect(400);
      expect(res.body.error).toBe('Cannot friend yourself');
    });

    it('rejects duplicate friendship', async () => {
      // first
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      // second
      const res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(409);
      expect(res.body.error).toBe('Friendship already exists');
    });

    it('friendship appears in GET list', async () => {
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      const list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].username).toBe('bob');
    });
  });

  describe('DELETE /api/v1/users/me/friends/:username', () => {
    let bobUsername;
    beforeEach(async () => {
      bobUsername = 'bob';
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: bobUsername })
        .expect(200);
    });

    it('deletes friendship', async () => {
      const res = await request(server)
        .delete(`/api/v1/users/me/friends/${bobUsername}`)
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(res.body.data.deleted).toBe(true);
      const list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it('returns 404 if friend user not found', async () => {
      const res = await request(server)
        .delete('/api/v1/users/me/friends/nonexistent')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(404);
      expect(res.body.error).toBe('User not found');
    });
  });
});
