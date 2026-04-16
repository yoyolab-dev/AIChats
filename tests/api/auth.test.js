import { describe, it, beforeEach } from '@jest/globals';
import request from 'supertest';
import { server, prisma } from '../setup.js';

describe('Auth API', () => {
  beforeEach(async () => {
    // Ensure clean database state
    await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "MessageRead", "Message", "Conversation", "Friendship", "User" RESTART IDENTITY CASCADE`;
  });

  it('should register a new user', async () => {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser', email: 'test@example.com' })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('apiKey');
  });
});