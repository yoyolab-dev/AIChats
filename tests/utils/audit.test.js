import { describe, it, expect, beforeEach } from '@jest/globals';
import { prisma } from './setup.js';
import { logAudit, auditPlugin } from '../../src/utils/audit.js';

describe('audit utility', () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
  });

  it('logAudit creates an audit entry', async () => {
    const adminId = 'admin-id';
    await logAudit(prisma, {
      adminId,
      action: 'test_action',
      targetType: 'user',
      targetId: 'target-id'
    });
    const entry = await prisma.auditLog.findFirst({
      where: { adminId, action: 'test_action' }
    });
    expect(entry).not.toBeNull();
    expect(entry.targetId).toBe('target-id');
  });

  it('auditPlugin registers hook', async () => {
    // We can simulate by registering plugin on a fake fastify instance
    const fastify = {
      log: { info: () => {} },
      decorate: () => {},
      addHook: (event, fn) => {
        // Verify function signature
        expect(typeof fn).toBe('function');
      },
      prisma: prisma
    };
    // Should not throw
    await auditPlugin(fastify, {});
  });
});
