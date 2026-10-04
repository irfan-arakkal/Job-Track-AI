import "server-only";

import { db } from "@/server/db";
import { RateLimitError } from "@/server/errors";

/**
 * Fixed-window rate limiter for expensive actions (uploads, AI calls, MCP requests).
 *
 * Counters live in PostgreSQL, so limits are shared by every server instance and survive
 * restarts (an in-memory Map would give each serverless function its own counters).
 * A single atomic upsert both increments the counter and starts a new window when the old one
 * has expired, so concurrent requests can't race past the limit.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = new Date(),
) {
  const resetAt = new Date(now.getTime() + windowMs);
  // Parameterised tagged template: values are sent separately from the SQL (no injection).
  const [row] = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "app_rate_limits" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "app_rate_limits"."resetAt" <= ${now} THEN 1 ELSE "app_rate_limits"."count" + 1 END,
      "resetAt" = CASE WHEN "app_rate_limits"."resetAt" <= ${now} THEN ${resetAt} ELSE "app_rate_limits"."resetAt" END
    RETURNING "count", "resetAt"`;

  if (row.count > limit) {
    throw new RateLimitError(
      undefined,
      Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
    );
  }
}

/** Removes expired windows (called by the daily job) so the table stays small. */
export async function pruneRateLimits(now = new Date()) {
  const { count } = await db.appRateLimit.deleteMany({ where: { resetAt: { lte: now } } });
  return count;
}

/** Test helper. */
export async function resetRateLimits() {
  await db.appRateLimit.deleteMany();
}
