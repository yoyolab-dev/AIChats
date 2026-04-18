import { randomBytes } from 'crypto';

/**
 * 生成一个随机的 API Key
 * @returns {string} 64 字符的十六进制字符串
 */
export function generateApiKey() {
  return randomBytes(32).toString('hex'); // 64 chars
}

/**
 * 比较客户端提供的 API Key 与数据库中的 Key（简单相等比较）
 * 如果将来需要哈希，在此处实现
 * @param {string} provided
 * @param {string} stored
 * @returns {boolean}
 */
export function verifyApiKey(provided, stored) {
  return provided === stored;
}
