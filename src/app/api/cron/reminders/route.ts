import { timingSafeEqual } from "node:crypto";

import { env } from "@/env";
import { logger } from "@/server/logger";
import { syncAllReminders } from "@/server/services/reminders";

export const maxDuration = 300;

/** Constant-time comparison, so response timing doesn't leak how much of the secret matched. */
function secretMatches(provided: string | null) {
  if (!env.CRON_SECRET || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/reminders — generates reminders for all users. Called on a schedule (e.g. Vercel
 * Cron, GitHub Actions or system cron) with `Authorization: Bearer $CRON_SECRET`.
 * Not callable by users; reminders are also refreshed whenever a user opens their dashboard.
 */
export async function GET(request: Request) {
  if (!secretMatches(request.headers.get("authorization"))) {
    return Response.json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid cron secret." } },
      { status: 401 },
    );
  }
  const startedAt = Date.now();
  const result = await syncAllReminders();
  logger.info("Reminder job finished", { ...result, durationMs: Date.now() - startedAt });
  return Response.json({ ok: true, ...result });
}
