import { validateApiKeyFormat, generateApiKey } from '@/utils/apiKey';

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
});