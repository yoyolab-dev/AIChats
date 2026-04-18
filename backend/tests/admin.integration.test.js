import { createClient } from '@prisma/client';
import http from 'node:http';
import { parse } from 'node:url';

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

let prisma, fastify, server;

beforeAll(async () => {
  const { default: Fastify } = await import('fastify');
  fastify = Fastify({ logger: true });

  const { authMiddleware } = await import('../src/plugins/auth.js');
  const users = await import('../src/routes/users.routes.js');
  const friendships = await import('../src/routes/friendships.routes.js');
  const messages = await import('../src/routes/messages.routes.js');
  const groups = await import('../src/routes/groups.routes.js');
  const admin = await import('../src/routes/admin.routes.js');

  // Auth routes
  fastify.post('/api/v1/auth/register', users.registerHandler);
  fastify.get('/api/v1/users/me', { onRequest: [authMiddleware] }, users.getMeHandler);
  fastify.get('/api/v1/users', { onRequest: [authMiddleware] }, users.listUsersHandler);
  fastify.get('/api/v1/users/:id', { onRequest: [authMiddleware] }, users.getUserHandler);

  // Friendships
  fastify.get('/api/v1/friends', { onRequest: [authMiddleware] }, friendships.listFriendsHandler);
  fastify.post('/api/v1/friends', { onRequest: [authMiddleware] }, friendships.sendFriendRequestHandler);
  fastify.put('/api/v1/friends/:id', { onRequest: [authMiddleware] }, friendships.updateFriendStatusHandler);
  fastify.delete('/api/v1/friends/:id', { onRequest: [authMiddleware] }, friendships.deleteFriendHandler);

  // Messages
  fastify.get('/api/v1/messages', { onRequest: [authMiddleware] }, messages.getMessagesHandler);
  fastify.post('/api/v1/messages', { onRequest: [authMiddleware] }, messages.sendMessageHandler);

  // Groups
  fastify.post('/api/v1/groups', { onRequest: [authMiddleware] }, groups.createGroupHandler);
  fastify.get('/api/v1/groups', { onRequest: [authMiddleware] }, groups.listGroupsHandler);
  fastify.post('/api/v1/groups/:groupId/members', { onRequest: [authMiddleware] }, groups.addGroupMemberHandler);
  fastify.delete('/api/v1/groups/:groupId/members/:userId', { onRequest: [authMiddleware] }, groups.removeGroupMemberHandler);
  fastify.get('/api/v1/groups/:groupId/messages', { onRequest: [authMiddleware] }, groups.getGroupMessagesHandler);
  fastify.post('/api/v1/groups/:groupId/messages', { onRequest: [authMiddleware] }, groups.sendGroupMessageHandler);

  // Admin
  fastify.get('/api/v1/admin/messages', { onRequest: [authMiddleware] }, admin.getAllMessagesHandler);
  fastify.get('/api/v1/admin/group-messages', { onRequest: [authMiddleware] }, admin.getAllGroupMessagesHandler);
  fastify.put('/api/v1/admin/relations/:friendshipId', { onRequest: [authMiddleware] }, admin.adminUpdateFriendshipHandler);

  await fastify.listen({ port: 0, host: '127.0.0.1' });
  server = fastify.server;

  prisma = new createClient({
    datasourceUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aichats_test'
  });
});

afterAll(async () => {
  await fastify.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.groupMessage.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
});

describe('Admin APIs', () => {
  let adminKey, userKey, adminId, userId;

  beforeEach(async () => {
    const adminRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'admin', nickname: 'Admin' }
    });
    adminKey = adminRes.body.apiKey;
    adminId = adminRes.body.id;
    // Promote to admin via direct DB update (since no endpoint)
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });

    const userRes = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/auth/register',
      method: 'POST',
      body: { username: 'user', nickname: 'User' }
    });
    userKey = userRes.body.apiKey;
    userId = userRes.body.id;
  });

  test('admin can view all private messages', async () => {
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/admin/messages',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminKey}` }
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messages');
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('non-admin cannot view all messages', async () => {
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/admin/messages',
      method: 'GET',
      headers: { Authorization: `Bearer ${userKey}` }
    });
    expect(res.status).toBe(403);
  });

  test('admin can force update friendship status', async () => {
    // Create a pending friendship: user -> admin? Actually admin sends to user
    await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/v1/friends',
      method: 'POST',
      headers: { Authorization: `Bearer ${userKey}` },
      body: { friendId: adminId }
    });

    // Find the friendship
    const friendship = await prisma.friendship.findFirst({
      where: { OR: [{ userId }, { friendId: adminId }] }
    });
    expect(friendship).not.toBeNull();

    // Admin updates status to blocked
    const res = await request(server, {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: `/api/v1/admin/relations/${friendship.id}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminKey}` },
      body: { status: 'blocked' }
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('BLOCKED');
  });
});
