import { describe, it, expect, beforeEach } from '@jest/globals';
import { RateLimiter } from '../../src/utils/rateLimit.js';

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter();
    limiter.windowMs = 1000; // 1 second for testing
    limiter.maxRequests = 2;
  });

  it('should allow requests within limit', () => {
    const res1 = limiter.check('user1');
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = limiter.check('user1');
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);
  });

  it('should reject after limit exceeded', () => {
    limiter.check('user1');
    limiter.check('user1');
    const res = limiter.check('user1');
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it('should allow after window passes', async () => {
    limiter.check('user1');
    limiter.check('user1');
    // Move time forward
    limiter.store.get('user1').timestamps[0] = Date.now() - 2000;
    const res = limiter.check('user1');
    expect(res.allowed).toBe(true);
  });

  it('should separate limits per key', () => {
    const res1a = limiter.check('user1');
    const res1b = limiter.check('user1');
    const res2a = limiter.check('user2');
    expect(res1a.allowed).toBe(true);
    expect(res1b.allowed).toBe(true);
    expect(res2a.allowed).toBe(true);
    // user1 exhausted? after two requests, remaining 0
    expect(limiter.check('user1').allowed).toBe(false);
    expect(limiter.check('user2').allowed).toBe(true); // still has 2
  });
});