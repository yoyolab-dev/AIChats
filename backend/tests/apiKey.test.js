import { generateApiKey, verifyApiKey } from '../src/utils/apiKey.js';

describe('API Key Utils', () => {
  test('generateApiKey returns a 64-character hex string', () => {
    const key = generateApiKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  test('generateApiKey generates unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });

  test('verifyApiKey returns true for matching keys', () => {
    const key = generateApiKey();
    expect(verifyApiKey(key, key)).toBe(true);
  });

  test('verifyApiKey returns false for non-matching keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(verifyApiKey(key1, key2)).toBe(false);
  });
});
