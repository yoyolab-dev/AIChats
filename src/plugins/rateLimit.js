import { RateLimiter } from '../utils/rateLimit.js';

const globalLimiter = new RateLimiter();

/**
 * Fastify plugin for rate limiting.
 * Configuration options:
 * - keyGenerator: (request) => string (default: API key hash or IP)
 * - maxRequests: number (default 1000)
 * - windowMs: ms (default 1 hour)
 */
export async function rateLimitPlugin(fastify, options) {
  fastify.decorate('rateLimit', {
    check: (key) => globalLimiter.check(key)
  });

  // Add global preHandler
  fastify.addHook('preHandler', async (request, reply) => {
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      return;
    }
    const key = options?.keyGenerator
      ? options.keyGenerator(request)
      : (request.user?.id?.toString() || request.ip);
    const result = globalLimiter.check(key);
    if (!result.allowed) {
      reply.code(429).send({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetAt - Date.now())} ms`,
        remaining: 0
      });
    } else {
      // Attach remaining to headers
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    }
  });
}

export { RateLimiter as RateLimiterClass };