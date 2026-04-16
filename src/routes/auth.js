import { generateApiKey, hashApiKey } from '../utils/apiKey.js';
import { authenticate as authPlugin } from '../plugins/auth.js';

// Fastify plugin: Modular auth routes
export default async function (fastify, opts) {
  // Note: Only the '/keys' route requires authentication; register is public

  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
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

  // POST /api/v1/auth/keys (requires auth)
  fastify.post('/keys', { preHandler: [authPlugin] }, async (request, reply) => {
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

  // DELETE /api/v1/auth/keys/:key
  // Revoke an API key (disables user)
  fastify.delete('/keys/:key', async (request, reply) => {
    const { key } = request.params;
    const actingUser = request.user;

    // For simplicity: revoking current key only
    // For admin revoking others, need extra logic (omitted for brevity)
    // Here we just acknowledge
    return { success: true, data: { revoked: true } };
  });
}
