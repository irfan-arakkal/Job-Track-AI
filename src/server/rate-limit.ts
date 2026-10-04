import "server-only";

import { RateLimitError } from "@/server/errors";

/**
 * A small fixed-window rate limiter for expensive actions (uploads, AI calls).
 *
 * Counters live in memory, which is fine for one server process (local dev, a single container).
 * With several instances or serverless functions each has its own counters, so production
 * should swap this for a shared store such as Redis/Upstash — the function signature can stay.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new RateLimitError(undefined, Math.ceil((bucket.resetAt - now) / 1000));
  }
  bucket.count += 1;
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
