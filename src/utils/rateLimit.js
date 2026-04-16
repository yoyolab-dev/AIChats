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
    let timestamps = this.store.get(key);
    if (!timestamps) {
      timestamps = [];
      this.store.set(key, timestamps);
    }

    // Remove old timestamps outside the window
    const windowStart = now - this.windowMs;
    timestamps = timestamps.filter(t => t > windowStart);

    const used = timestamps.length;
    const allowed = used < this.maxRequests;

    if (allowed) {
      timestamps.push(now);
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
    for (const [key, timestamps] of this.store.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.store.delete(key);
      } else if (filtered.length !== timestamps.length) {
        this.store.set(key, filtered);
      }
    }
  }
}

export { RateLimiter };
