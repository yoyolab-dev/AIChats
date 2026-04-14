/**
 * Audit logging utility.
 * Records administrative actions to AuditLog table.
 */

/**
 * Create an audit log entry.
 * @param {object} options
 * @param {string} options.adminId - User ID of the admin performing action
 * @param {string} options.action - Action type (e.g., 'create_user', 'delete_message')
 * @param {string} options.targetType - Target type (user, message, conversation, friendship)
 * @param {string} options.targetId - Target record ID
 * @param {object} [options.details] - Additional JSON-serializable data
 * @param {string} [options.ipAddress] - IP address of the admin
 */
export async function logAudit(prisma, { adminId, action, targetType, targetId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details: details ? JSON.stringify(details) : null,
        ipAddress
      }
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

/**
 * Fastify plugin to automatically record audit logs for designated routes.
 * Usage: register plugin and add `audit: { action, targetType, targetIdGetter }` to route options.
 */
export async function auditPlugin(fastify, options) {
  fastify.addHook('onResponse', async (request, reply) => {
    // Only audit successful admin actions (2xx)
    if (reply.statusCode < 200 || reply.statusCode >= 300) {
      return;
    }
    const audit = request.routeOptions?.audit;
    if (!audit) return;

    const adminId = request.user?.id;
    if (!adminId) return; // not authenticated

    // Determine targetId
    let targetId = audit.targetId;
    if (typeof audit.targetIdGetter === 'function') {
      try {
        targetId = await audit.targetIdGetter(request);
      } catch (e) {
        targetId = null;
      }
    }

    if (!targetId) return;

    const ip = request.headers['x-forwarded-for'] || request.connection?.remoteAddress || request.ip;

    await logAudit(fastify.prisma, {
      adminId,
      action: audit.action,
      targetType: audit.targetType,
      targetId,
      details: audit.details,
      ipAddress: ip
    });
  });
}