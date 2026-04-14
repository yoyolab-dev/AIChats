import { describe, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/server.js';

describe('Auth API', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser', email: 'test@example.com' })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('apiKey');
  });
});