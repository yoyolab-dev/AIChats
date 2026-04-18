import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from './setup.js';

describe('Friendships API', () => {
  let aliceKey, bobKey, charlieKey, aliceId, bobId, charlieId;

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
    const charlieMe = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${charlieKey}`)
      .expect(200);
    charlieId = charlieMe.body.data.id;
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

    it('includes accepted friendships only, regardless of direction', async () => {
      // Alice sends request to Bob -> status pending
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      // Alice's list should be empty because pending
      let list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(0);

      // Bob accepts the friendship request
      await request(server)
        .put('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ status: 'accepted' })
        .expect(200);

      // Both Alice and Bob should see each other in their friends lists
      list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].username).toBe('bob');

      list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${bobKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].username).toBe('alice');
    });

    it('mutual accepted status appears only once', async () => {
      // Alice and Bob become friends via accept
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      await request(server)
        .put('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ status: 'accepted' })
        .expect(200);

      // Alice's list should have exactly 1 friend: bob
      const list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].username).toBe('bob');
    });
  });

  describe('POST /api/v1/users/me/friends', () => {
    it('creates pending friend request', async () => {
      const res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.userId).toBe(aliceId);
      expect(res.body.data.friendId).toBe(bobId);
      expect(res.body.data.status).toBe('pending');
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

    it('rejects duplicate friendship in either direction', async () => {
      // first
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      // second from same direction
      let res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(409);
      expect(res.body.error).toBe('Friendship already exists');

      // second from opposite direction (Bob to Alice) should also conflict
      res = await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ friendUsername: 'alice' })
        .expect(409);
      expect(res.body.error).toBe('Friendship already exists');
    });
  });

  describe('PUT /api/v1/users/me/friends/:username', () => {
    it('allows receiver to accept a pending request', async () => {
      // Alice sends request to Bob
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);

      // Bob accepts
      const res = await request(server)
        .put('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ status: 'accepted' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('accepted');
    });

    it('allows sender to cancel (reject) a pending request', async () => {
      // Alice sends to Bob
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);

      // Alice cancels
      const res = await request(server)
        .put('/api/v1/users/me/friends/bob')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ status: 'rejected' })
        .expect(200);
      expect(res.body.data.status).toBe('rejected');

      // No friendship should appear in GET lists
      const listA = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(listA.body.data).toHaveLength(0);
      const listB = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${bobKey}`)
        .expect(200);
      expect(listB.body.data).toHaveLength(0);
    });

    it('allows either party to block the other', async () => {
      // Alice and Bob are accepted
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      await request(server)
        .put('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ status: 'accepted' })
        .expect(200);

      // Bob blocks Alice
      const res = await request(server)
        .put('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ status: 'blocked' })
        .expect(200);
      expect(res.body.data.status).toBe('blocked');

      // Alice should no longer see Bob in friends list
      const list = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it('returns 404 if friendship does not exist', async () => {
      const res = await request(server)
        .put('/api/v1/users/me/friends/nonexistent')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ status: 'accepted' })
        .expect(404);
      expect(res.body.error).toBe('Friendship not found');
    });

    it('rejects invalid status values', async () => {
      const res = await request(server)
        .put('/api/v1/users/me/friends/bob')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ status: 'foo' })
        .expect(400);
      expect(res.body.error).toBe('Invalid status');
    });
  });

  describe('DELETE /api/v1/users/me/friends/:username', () => {
    it('deletes friendship regardless of who initiates', async () => {
      // Alice sends to Bob, Bob accepts
      await request(server)
        .post('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .send({ friendUsername: 'bob' })
        .expect(200);
      await request(server)
        .put('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .send({ status: 'accepted' })
        .expect(200);

      // Bob deletes the friendship
      const res = await request(server)
        .delete('/api/v1/users/me/friends/alice')
        .set('Authorization', `Bearer ${bobKey}`)
        .expect(200);
      expect(res.body.data.deleted).toBe(true);

      // Both should have empty friend lists
      const listA = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(200);
      expect(listA.body.data).toHaveLength(0);
      const listB = await request(server)
        .get('/api/v1/users/me/friends')
        .set('Authorization', `Bearer ${bobKey}`)
        .expect(200);
      expect(listB.body.data).toHaveLength(0);
    });

    it('returns 404 if friendship does not exist', async () => {
      const res = await request(server)
        .delete('/api/v1/users/me/friends/nonexistent')
        .set('Authorization', `Bearer ${aliceKey}`)
        .expect(404);
      expect(res.body.error).toBe('Friendship not found');
    });
  });
});