import "server-only";

import {
  analyticsRanges,
  type AnalyticsRange,
  average,
  median,
  monthKey,
  monthLabel,
  monthSeries,
  responseDays,
  topWithOther,
} from "@/lib/analytics";
import { db } from "@/server/db";
import { getStatistics } from "@/server/services/insights";

/** All analytics for one user and time range. Scoped by user; computed per request. */
export async function getAnalytics(userId: string, range: AnalyticsRange, now = new Date()) {
  const months = analyticsRanges.find((r) => r.value === range)?.months ?? null;
  const from = months
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))
    : undefined;

  const [stats, applications] = await Promise.all([
    getStatistics(userId, { from }),
    db.application.findMany({
      where: { userId, appliedAt: from ? { gte: from } : { not: null } },
      select: {
        appliedAt: true,
        location: true,
        company: { select: { name: true } },
        statusChanges: { select: { toStatus: true, changedAt: true } },
      },
    }),
  ]);

  // Applications per month, including empty months.
  const perMonthCounts = new Map<string, number>();
  for (const app of applications) {
    const key = monthKey(app.appliedAt!);
    perMonthCounts.set(key, (perMonthCounts.get(key) ?? 0) + 1);
  }
  const earliest = applications.reduce<Date | null>(
    (min, a) => (!min || a.appliedAt! < min ? a.appliedAt! : min),
    null,
  );
  const seriesStart = from ?? earliest ?? now;
  const perMonth = monthSeries(seriesStart, now).map((key) => ({
    month: key,
    label: monthLabel(key),
    count: perMonthCounts.get(key) ?? 0,
  }));

  // Response time.
  const days = applications
    .map((a) => responseDays(a.appliedAt, a.statusChanges))
    .filter((d): d is number => d !== null);

  // Breakdowns.
  const byCompany = new Map<string, number>();
  const byLocation = new Map<string, number>();
  for (const app of applications) {
    byCompany.set(app.company.name, (byCompany.get(app.company.name) ?? 0) + 1);
    const location = app.location?.trim() || "Not specified";
    byLocation.set(location, (byLocation.get(location) ?? 0) + 1);
  }

  return {
    range,
    totals: stats,
    responseTime: {
      averageDays: average(days),
      medianDays: median(days),
      responses: days.length,
    },
    perMonth,
    byCompany: topWithOther(byCompany),
    byLocation: topWithOther(byLocation),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
