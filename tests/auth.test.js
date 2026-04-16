import request from 'supertest';
import { server, prisma } from './setup.js';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  const testApiKey = 'sk-test-1234567890';

  beforeAll(async () => {
    // 创建一个测试用户
    const hashed = await bcrypt.hash(testApiKey, 10);
    await prisma.user.create({
      data: {
        username: 'testuser',
        apiKeyHash: hashed,
        isAdmin: false,
        status: 'active'
      }
    });
  });

  test('POST /api/v1/auth/login - success', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ apiKey: testApiKey })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('testuser');
  });

  test('POST /api/v1/auth/login - invalid key', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ apiKey: 'wrong-key' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid API Key');
  });

  test('GET /api/v1/users/me - requires auth', async () => {
    const res = await request(server)
      .get('/api/v1/users/me')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/users/me - with valid token', async () => {
    const res = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${testApiKey}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('testuser');
  });
});