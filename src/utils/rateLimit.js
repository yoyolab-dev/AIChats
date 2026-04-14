/**
 * In-memory rate limiter using sliding window.
 * Key: identifier (e.g., API key or IP)
 * Structure: Map<key, { timestamps: number[], count: number }>
 */

class RateLimiter {
  constructor() {
    this.windowMs = 60 * 60 * 1000; // 1 hour
    this.maxRequests = 1000;
    this.store = new Map();
    // Cleanup interval
    setInterval(() => this.clean(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed.
   * @param {string} key
   * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
   */
  check(key) {
    const now = Date.now();
    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [], count: 0 };
      this.store.set(key, record);
    }

    // Remove old timestamps
    const windowStart = now - this.windowMs;
    record.timestamps = record.timestamps.filter(t => t > windowStart);
    record.count = record.timestamps.length;

    const remaining = this.maxRequests - record.count;
    const allowed = remaining > 0;

    if (allowed) {
      record.timestamps.push(now);
      record.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetAt: now + this.windowMs // can be improved to actual window end
    };
  }

  /**
   * Clean up old records to prevent memory leak.
   */
  clean() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter(t => t > windowStart);
      record.count = record.timestamps.length;
      if (record.count === 0) {
        this.store.delete(key);
      }
    }
  }
}

export { RateLimiter };