import { randomBytes } from 'crypto';

/**
 * 生成 API Key
 * 使用 crypto.randomBytes(32) 生成 256 位熵，转换为 64 位十六进制字符串
 * 格式: sk_live_xxxxxxxx... (64 字符)
 */
export function generateApiKey(): string {
  const bytes = randomBytes(32); // 256 bits
  return `sk_live_${bytes.toString('hex')}`;
}

/**
 * 验证 API Key 格式（仅格式校验，不查询数据库）
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // 格式: sk_live_ + 64 位十六进制
  const pattern = /^sk_live_[a-f0-9]{64}$/;
  return pattern.test(apiKey);
}

/**
 * 从 API Key 提取前缀（用于日志脱敏）
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '***';
  return `${apiKey.slice(0, 8)}...`;
}
