import { validateApiKeyFormat, generateApiKey, maskApiKey } from '@/utils/apiKey';

describe('apiKey utils', () => {
  it('validateApiKeyFormat accepts valid key', () => {
    const valid = 'sk_live_' + 'a'.repeat(64);
    expect(validateApiKeyFormat(valid)).toBe(true);
  });

  it('validateApiKeyFormat rejects short key', () => {
    expect(validateApiKeyFormat('sk_live_abc')).toBe(false);
  });

  it('validateApiKeyFormat rejects wrong prefix', () => {
    expect(validateApiKeyFormat('sk_abc_' + 'a'.repeat(32))).toBe(false);
  });

  it('generateApiKey creates correct format', () => {
    const key = generateApiKey();
    expect(key.startsWith('sk_live_')).toBe(true);
    expect(key.length).toBe(72); // 8 (prefix) + 64 hex chars
  });

  describe('maskApiKey', () => {
    it('should return *** for empty string', () => {
      expect(maskApiKey('')).toBe('***');
    });

    it('should return *** for null', () => {
      expect(maskApiKey(null as any)).toBe('***');
    });

    it('should return *** for undefined', () => {
      expect(maskApiKey(undefined as any)).toBe('***');
    });

    it('should mask api key correctly', () => {
      const key = 'sk_live_1234567890abcdef';
      expect(maskApiKey(key)).toBe('sk_live_...');
    });

    it('should return first 8 chars with ellipsis for any key', () => {
      const key = 'sk_live_' + 'a'.repeat(64);
      expect(maskApiKey(key)).toBe('sk_live_...');
    });
  });
});
