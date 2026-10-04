import { beforeEach, describe, expect, it } from "vitest";

import { RateLimitError } from "@/server/errors";
import { checkRateLimit, pruneRateLimits, resetRateLimits } from "@/server/rate-limit";

import { db, resetDatabase } from "../support/db";

describe("database-backed rate limiter", () => {
  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimits();
  });

  it("allows up to the limit, then rejects with a retry time", async () => {
    const now = new Date("2026-05-20T12:00:00Z");
    for (let i = 0; i < 3; i++) await checkRateLimit("k", 3, 60_000, now);
    const error = await checkRateLimit("k", 3, 60_000, now).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterSeconds).toBe(60);
  });

  it("starts a new window after the old one expires", async () => {
    const t0 = new Date("2026-05-20T12:00:00Z");
    await checkRateLimit("k", 1, 60_000, t0);
    await expect(checkRateLimit("k", 1, 60_000, t0)).rejects.toBeInstanceOf(RateLimitError);
    await expect(
      checkRateLimit("k", 1, 60_000, new Date(t0.getTime() + 61_000)),
    ).resolves.toBeUndefined();
  });

  it("keeps separate counters per key", async () => {
    const now = new Date();
    await checkRateLimit("user-a", 1, 60_000, now);
    await expect(checkRateLimit("user-b", 1, 60_000, now)).resolves.toBeUndefined();
  });

  it("can't be raced past the limit by concurrent requests", async () => {
    const now = new Date();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => checkRateLimit("burst", 5, 60_000, now)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
  });

  it("prunes expired windows", async () => {
    await checkRateLimit("old", 5, 1_000, new Date("2026-01-01T00:00:00Z"));
    await checkRateLimit("fresh", 5, 60_000);
    expect(await pruneRateLimits()).toBe(1);
    expect(await db.appRateLimit.count()).toBe(1);
  });
});
