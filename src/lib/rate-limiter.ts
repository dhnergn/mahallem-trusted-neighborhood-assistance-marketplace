interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRatePerSec: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Token bucket rate limiter implementation.
 * @param key unique identifier (e.g. `otp:ip_hash` or `auth:phone_hash`)
 * @param maxTokens burst capacity
 * @param refillIntervalSeconds seconds required to refill 1 token
 */
export function checkRateLimit(
  key: string,
  maxTokens: number = 5,
  refillIntervalSeconds: number = 12
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: maxTokens,
      lastRefill: now,
      maxTokens,
      refillRatePerSec: 1 / refillIntervalSeconds,
    };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const addedTokens = elapsedSeconds * bucket.refillRatePerSec;
  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + addedTokens);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      success: true,
      remaining: Math.floor(bucket.tokens),
      resetSeconds: Math.ceil((1 - bucket.tokens) / bucket.refillRatePerSec),
    };
  }

  const secondsUntilNextToken = Math.ceil((1 - bucket.tokens) / bucket.refillRatePerSec);
  return {
    success: false,
    remaining: 0,
    resetSeconds: Math.max(1, secondsUntilNextToken),
  };
}

/**
 * Clear rate limit for a key (useful for tests and resets upon successful auth).
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
