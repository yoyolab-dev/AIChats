import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Generate a random API key in format: sk-<prefix>-<random32>
 * @param {string} prefix - e.g., 'yoyo'
 * @returns {string}
 */
export function generateApiKey(prefix = 'yoyo') {
  const random = crypto.randomBytes(16).toString('hex');
  return `sk-${prefix}-${random}`;
}

/**
 * Hash an API key for storage
 * @param {string} apiKey
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashApiKey(apiKey) {
  const saltRounds = 10;
  return bcrypt.hash(apiKey, saltRounds);
}

/**
 * Verify an API key against stored hash
 * @param {string} apiKey - plain text key from request
 * @param {string} hash - stored bcrypt hash
 * @returns {Promise<boolean>}
 */
export async function verifyApiKey(apiKey, hash) {
  return bcrypt.compare(apiKey, hash);
}