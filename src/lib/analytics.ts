/*
 * Pure analytics helpers (no database) — unit-tested in tests/unit/analytics.test.ts.
 */

export const analyticsRanges = [
  { value: "3m", label: "Last 3 months", months: 3 },
  { value: "6m", label: "Last 6 months", months: 6 },
  { value: "12m", label: "Last 12 months", months: 12 },
  { value: "all", label: "All time", months: null },
] as const;
export type AnalyticsRange = (typeof analyticsRanges)[number]["value"];

/** "2026-05" for a date (UTC — applied dates are stored as midnight UTC). */
export const monthKey = (date: Date) => date.toISOString().slice(0, 7);

/** Every month from `start` to `end` inclusive, so empty months show as zero instead of vanishing. */
export function monthSeries(start: Date, end: Date) {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1);
  while (cursor.getTime() <= last) {
    months.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function monthLabel(key: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
}

type StatusChangeLike = { toStatus: string; changedAt: Date };

/**
 * Days from applying to the company's first response — the first status change to anything
 * other than Wishlist/Applied. Applications without a response are skipped (not counted as 0).
 */
export function responseDays(appliedAt: Date | null, changes: StatusChangeLike[]): number | null {
  if (!appliedAt) return null;
  const first = changes
    .filter(
      (c) => c.toStatus !== "APPLIED" && c.toStatus !== "WISHLIST" && c.changedAt >= appliedAt,
    )
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())[0];
  if (!first) return null;
  return Math.max(0, (first.changedAt.getTime() - appliedAt.getTime()) / 86_400_000);
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Top N groups by count, with the rest folded into "Other" (never an unbounded chart). */
export function topWithOther(counts: Map<string, number>, limit = 8) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, limit).map(([name, count]) => ({ name, count }));
  const rest = sorted.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  return rest > 0 ? [...top, { name: "Other", count: rest }] : top;
}
