/**
 * In-memory rate limiter using sliding window.
 * Key: identifier (e.g., API key or IP)
 * Structure: Map<key, { timestamps: number[] }>
 */

class RateLimiter {
  constructor() {
    this.windowMs = 60 * 60 * 1000; // 1 hour
    this.maxRequests = 1000;
    this.store = new Map();
    // Cleanup interval (unref'd so it won't keep process alive)
    const interval = setInterval(() => this.clean(), 5 * 60 * 1000);
    interval.unref();
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
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Remove old timestamps outside the window
    const windowStart = now - this.windowMs;
    record.timestamps = record.timestamps.filter(t => t > windowStart);

    const used = record.timestamps.length;
    const allowed = used < this.maxRequests;

    if (allowed) {
      record.timestamps.push(now);
    }

    const remaining = this.maxRequests - (allowed ? used + 1 : used);

    // Simplify resetAt to now + windowMs (could be more precise)
    const resetAt = now + this.windowMs;

    return { allowed, remaining: Math.max(0, remaining), resetAt };
  }

  /**
   * Clean up old records to prevent memory leak.
   */
  clean() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter(t => t > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

export { RateLimiter };
