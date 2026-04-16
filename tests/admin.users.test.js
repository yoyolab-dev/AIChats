import request from 'supertest';
import { server, prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Admin Users API', () => {
  const adminKey = 'sk-admin-test-9876543210';
  const userKey = 'sk-user-test-1234567890';
  let adminUserId;
  let regularUserId;

  beforeEach(async () => {
    // Ensure clean database state
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;
    // 创建管理员
    const adminHash = await bcrypt.hash(adminKey, 10);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        apiKeyHash: adminHash,
        isAdmin: true,
        status: 'active'
      }
    });
    adminUserId = admin.id;

    // 创建普通用户
    const userHash = await bcrypt.hash(userKey, 10);
    const user = await prisma.user.create({
      data: {
        username: 'regularuser',
        apiKeyHash: userHash,
        isAdmin: false,
        status: 'active',
        displayName: 'Regular User'
      }
    });
    regularUserId = user.id;
  });

  test('GET /api/v1/admin/users - unauthorized returns 401', async () => {
    await request(server).get('/api/v1/admin/users').expect(401);
  });

  test('GET /api/v1/admin/users - non-admin returns 403', async () => {
    await request(server)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userKey}`)
      .expect(403);
  });

  test('GET /api/v1/admin/users - admin success', async () => {
    const res = await request(server)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminKey}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some(u => u.username === 'regularuser')).toBe(true);
  });

  test('POST /api/v1/admin/users - create new user', async () => {
    const res = await request(server)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminKey}`)
      .send({
        username: 'newuser',
        isAdmin: false,
        status: 'active',
        displayName: 'New User'
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('newuser');
    expect(res.body.data.apiKey).toMatch(/^sk-/);
  });

  test('PUT /api/v1/admin/users/:id - update user', async () => {
    const res = await request(server)
      .put(`/api/v1/admin/users/${regularUserId}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .send({
        username: 'updateduser',
        isAdmin: false,
        status: 'active',
        displayName: 'Updated User'
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('updateduser');
    expect(res.body.data.displayName).toBe('Updated User');
  });

  test('DELETE /api/v1/admin/users/:id - soft delete', async () => {
    const res = await request(server)
      .delete(`/api/v1/admin/users/${regularUserId}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('disabled');

    // 确认用户已禁用
    const getRes = await request(server)
      .get(`/api/v1/admin/users/${regularUserId}`)
      .set('Authorization', `Bearer ${adminKey}`)
      .expect(200);

    expect(getRes.body.data.status).toBe('disabled');
  });
});