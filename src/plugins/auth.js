import { verifyApiKey } from '../utils/apiKey.js';
import { prisma } from './prisma.js';

/**
 * Authenticate middleware for Fastify routes.
 * Verifies API Key from Authorization header and attaches user to request.user.
 */
export async function authenticate(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw request.httpErrors.unauthorized('Missing or invalid Authorization header');
  }
  const apiKey = authHeader.slice(7).trim();

  // Find user by API key hash
  const users = await prisma.user.findMany({
    where: { status: 'active' }
  });

  for (const user of users) {
    const valid = await verifyApiKey(apiKey, user.apiKeyHash);
    if (valid) {
      request.user = user;
      return;
    }
  }

  throw request.httpErrors.unauthorized('Invalid API Key');
}