import { describe, it, expect, beforeEach } from '@jest/globals';
import { generateApiKey, hashApiKey, verifyApiKey } from '../../src/utils/apiKey.js';

describe('API Key Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate key with correct format', () => {
      const key = generateApiKey('test');
      expect(key).toMatch(/^sk-test-[a-f0-9]{32}$/);
    });

    it('should use default prefix yoyo', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^sk-yoyo-[a-f0-9]{32}$/);
    });
  });

  describe('hashApiKey and verifyApiKey', () => {
    let hash;

    beforeEach(async () => {
      const key = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';
      hash = await hashApiKey(key);
    });

    it('should verify correct key', async () => {
      const valid = await verifyApiKey('sk-test1234567890abcdefghijklmnopqrstuvwxyz', hash);
      expect(valid).toBe(true);
    });

    it('should reject incorrect key', async () => {
      const valid = await verifyApiKey('wrong-key', hash);
      expect(valid).toBe(false);
    });
  });
});