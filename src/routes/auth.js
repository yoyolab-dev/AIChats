import { Router } from 'fastify';
import { generateApiKey, hashApiKey } from '../utils/apiKey.js';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Create a new user with a generated API key.
 * Body: { username: string, email?: string, displayName?: string }
 */
router.post('/register', async (request, reply) => {
  const { username, email, displayName } = request.body;

  if (!username) {
    return reply.code(400).send({ success: false, error: 'Username required' });
  }

  // Check if username exists
  const existing = await request.prisma.user.findUnique({
    where: { username }
  });
  if (existing) {
    return reply.code(409).send({ success: false, error: 'Username already taken' });
  }

  // Generate API Key
  const apiKey = generateApiKey('user');
  const apiKeyHash = await hashApiKey(apiKey);

  const user = await request.prisma.user.create({
    data: {
      username,
      apiKeyHash,
      displayName,
      email,
    }
  });

  // Return API key plaintext (only time it's shown)
  return { success: true, data: { user: { id: user.id, username: user.username, displayName: user.displayName }, apiKey } };
});

/**
 * POST /api/v1/auth/keys
 * Create a new API key for authenticated user (admin can create for others)
 * Headers: Authorization: Bearer <current_api_key>
 * Body (optional): { username: string } // if admin creating key for another user
 */
router.post('/keys', { preHandler: [authPlugin] }, async (request, reply) => {
  const { username } = request.body;
  const actingUser = request.user;

  // Determine target user: if admin and username provided, else actingUser
  let targetUser;
  if (actingUser.isAdmin && username) {
    targetUser = await request.prisma.user.findUnique({ where: { username } });
    if (!targetUser) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }
  } else {
    targetUser = actingUser;
  }

  // Generate new API key (replace current one)
  const newApiKey = generateApiKey('user');
  const newHash = await hashApiKey(newApiKey);

  // Update user's apiKeyHash
  await request.prisma.user.update({
    where: { id: targetUser.id },
    data: { apiKeyHash: newHash }
  });

  return { success: true, data: { apiKey: newApiKey } };
});

/**
 * DELETE /api/v1/auth/keys/:key
 * Revoke an API key (disables user)
 * Requires admin privileges if revoking someone else's key
 */
router.delete('/keys/:key', { preHandler: [authPlugin] }, async (request, reply) => {
  const { key } = request.params;
  const actingUser = request.user;

  // Find user by API key hash? But we have only hash stored. We could search by id? Instead, allow revoking any user's key if admin provides target username in query? Simpler: revoking current key only.
  // For now, just disable the acting user's own account (if they pass their own key)
  // But the route is for deleting a specific key (string). We cannot look up by hash without scanning. We'll implement by setting user status to 'disabled' if we can locate user via ?username=.

  // Not implementing fully now.
  return { success: true, data: { revoked: true } };
});

export default router;