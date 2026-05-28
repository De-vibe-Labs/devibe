import { env } from "./env.js";
import { RateLimitError } from "./errors.js";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window in-memory rate limiter keyed by caller identity.
 * For multi-instance deployments swap the Map for a Redis INCR+EXPIRE.
 */
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private windowMs = env.RATE_LIMIT_WINDOW_MS,
    private max = env.RATE_LIMIT_MAX,
  ) {}

  /** Throws RateLimitError when the key exceeds its budget for the window. */
  check(key: string): { remaining: number; resetAt: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + this.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { remaining: this.max - 1, resetAt };
    }

    bucket.count += 1;
    if (bucket.count > this.max) {
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${Math.ceil((bucket.resetAt - now) / 1000)}s`,
      );
    }
    return { remaining: this.max - bucket.count, resetAt: bucket.resetAt };
  }

  /** Periodically drop expired buckets so the map does not grow unbounded. */
  sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

export const rateLimiter = new RateLimiter();
