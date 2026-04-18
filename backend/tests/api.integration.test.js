import { createClient } from '@prisma/client';
import http from 'node:http';
import { parse } from 'node:url';

// Helper to make HTTP calls to Fastify server
function request(server, options) {
  return new Promise((resolve, reject) => {
    const { hostname, port, path, method, headers, body } = options;
    const url = parse(path);
    const req = http.request({
      hostname,
      port,
      method,
      path: url.path,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Run tests in serial because we share a DB
let prisma, fastify, server;

beforeAll(async () => {
  // Start server
  const { default: Fastify } = await import('fastify');
  fastify = Fastify({ logger: true });

  // Register routes (same as server.js)
  const { authMiddleware } = await import('./src/plugins/auth.js');
  const users = await import('./src/routes/users.routes.js');
  const friendships = await import('./src/routes/friendships.routes.js');
  const messages = await import('./src/routes/messages.routes.js');
  const groups = await import('./src/routes/groups.routes.js');

  fastify.post('/api/v1/auth/register', users.registerHandler);
  fastify.get('/api/v1/users/me', { onRequest: [authMiddleware] }, users.getMeHandler);
  fastify.get('/api/v1/users', { onRequest: [authMiddleware] }, users.listUsersHandler);
  fastify.get('/api/v1/users/:id', { onRequest: [authMiddleware] }, users.getUserHandler);
  fastify.put('/api/v1/users/:id', { onRequest: [authMiddleware] }, users.updateUserHandler);
  fastify.delete('/api/v1/users/:id', { onRequest: [authMiddleware] }, users.deleteUserHandler);

  fastify.get('/api/v1/friends', { onRequest: [authMiddleware] }, friendships.listFriendsHandler);
  fastify.post('/api/v1/friends', { onRequest: [authMiddleware] }, friendships.sendFriendRequestHandler);
  fastify.put('/api/v1/friends/:id', { onRequest: [authMiddleware] }, friendships.updateFriendStatusHandler);
  fastify.delete('/api/v1/friends/:id', { onRequest: [authMiddleware] }, friendships.deleteFriendHandler);

  fastify.get('/api/v1/messages', { onRequest: [authMiddleware] }, messages.getMessagesHandler);
  fastify.post('/api/v1/messages', { onRequest: [authMiddleware] }, messages.sendMessageHandler);

  fastify.post('/api/v1/groups', { onRequest: [authMiddleware] }, groups.createGroupHandler);
  fastify.get('/api/v1/groups', { onRequest: [authMiddleware] }, groups.listGroupsHandler);
  fastify.post('/api/v1/groups/:groupId/members', { onRequest: [authMiddleware] }, groups.addGroupMemberHandler);
  fastify.delete('/api/v1/groups/:groupId/members/:userId', { onRequest: [authMiddleware] }, groups.removeGroupMemberHandler);
  fastify.get('/api/v1/groups/:groupId/messages', { onRequest: [authMiddleware] }, groups.getGroupMessagesHandler);
  fastify.post('/api/v1/groups/:groupId/messages', { onRequest: [authMiddleware] }, groups.sendGroupMessageHandler);

  await fastify.listen({ port: 0, host: '127.0.0.1' });
  server = fastify.server;

  // Connect to test DB
  prisma = new createClient({
    datasourceUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aichats_test'
  });
});

afterAll(async () => {
  await fastify.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean DB between tests
  await prisma.message.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.groupMessage.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
});

describe('Auth & Users', () => {
  test('register creates a new user with apiKey', async () => {
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'alice', nickname: 'Alice' }
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('apiKey');
    expect(res.body.username).toBe('alice');
  });

  test('duplicate username returns 409', async () => {
    await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'bob' }
    });
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'bob' }
    });
    expect(res.status).toBe(409);
  });
});

describe('Friendships', () => {
  let aliceKey, bobKey, aliceId, bobId;

  beforeEach(async () => {
    // Create two users
    const aliceRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'alice' }
    });
    aliceKey = aliceRes.body.apiKey;
    aliceId = aliceRes.body.id;

    const bobRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'bob' }
    });
    bobKey = bobRes.body.apiKey;
    bobId = bobRes.body.id;
  });

  test('alice can send friend request to bob', async () => {
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/friends',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { friendId: bobId }
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
  });

  test('bob can list pending requests', async () => {
    // First alice sends request
    await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/friends',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { friendId: bobId }
    });
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/friends?status=pending',
      method: 'GET',
      headers: { Authorization: `Bearer ${bobKey}` }
    });
    expect(res.status).toBe(200);
    expect(res.body.friendships).toHaveLength(1);
    expect(res.body.friendships[0].status).toBe('PENDING');
  });

  test('bob can accept friend request', async () => {
    await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/friends',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { friendId: bobId }
    });
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: `/api/v1/friends/${aliceId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${bobKey}` },
      body: { status: 'accepted' }
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
  });
});

describe('Messages', () => {
  let aliceKey, bobKey, aliceId, bobId;

  beforeEach(async () => {
    const aliceRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'alice' }
    });
    aliceKey = aliceRes.body.apiKey;
    aliceId = aliceRes.body.id;

    const bobRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'bob' }
    });
    bobKey = bobRes.body.apiKey;
    bobId = bobRes.body.id;
  });

  test('alice can send message to bob', async () => {
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/messages',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { receiverId: bobId, content: 'Hello Bob!' }
    });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Hello Bob!');
    expect(res.body.senderId).toBe(aliceId);
  });

  test('bob can retrieve conversation with alice', async () => {
    // Send a message
    await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/messages',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { receiverId: bobId, content: 'Hi!' }
    });
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: `/api/v1/messages?withUser=${aliceId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${bobKey}` }
    });
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('Hi!');
  });
});

describe('Groups', () => {
  let aliceKey, bobKey, aliceId, bobId, groupId;

  beforeEach(async () => {
    const aliceRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'alice' }
    });
    aliceKey = aliceRes.body.apiKey;
    aliceId = aliceRes.body.id;

    const bobRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'bob' }
    });
    bobKey = bobRes.body.apiKey;
    bobId = bobRes.body.id;
  });

  test('alice creates a group', async () => {
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/groups',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { name: 'Test Group', description: 'Testing' }
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Group');
    expect(res.body.ownerId).toBe(aliceId);
    groupId = res.body.id;
  });

  test('alice adds bob to group', async () => {
    // Create group first
    const createRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/groups',
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { name: 'Test Group' }
    });
    groupId = createRes.body.id;

    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: `/api/v1/groups/${groupId}/members`,
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: { userId: bobId }
    });
    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe(bobId);
    expect(res.body.role).toBe('MEMBER');
  });
});
