import "server-only";

import { ApplicationStatus } from "@/generated/prisma/client";
import { applicationStatuses } from "@/lib/applications";
import { db } from "@/server/db";

/** Start of the current month in UTC. */
function startOfMonthUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Everything the dashboard shows, in one call. All queries are scoped to the user and run in
 * parallel; counting happens in the database (COUNT / GROUP BY), not by loading every row.
 */
export async function getDashboardData(userId: string, now = new Date()) {
  const [
    total,
    appliedThisMonth,
    interviewTotal,
    upcomingInterviewCount,
    byStatus,
    recentApplications,
    upcomingInterviews,
  ] = await Promise.all([
    db.application.count({ where: { userId } }),
    db.application.count({ where: { userId, appliedAt: { gte: startOfMonthUtc(now) } } }),
    db.interview.count({ where: { userId } }),
    db.interview.count({ where: { userId, status: "SCHEDULED", scheduledAt: { gte: now } } }),
    db.application.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    db.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { company: { select: { name: true } } },
    }),
    db.interview.findMany({
      where: { userId, status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: {
        application: { select: { id: true, jobTitle: true, company: { select: { name: true } } } },
      },
    }),
  ]);

  const countFor = (status: ApplicationStatus) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    totals: {
      applications: total,
      appliedThisMonth,
      interviews: interviewTotal,
      upcomingInterviews: upcomingInterviewCount,
      // "Offers" counts offers still open plus those accepted.
      offers: countFor(ApplicationStatus.OFFER) + countFor(ApplicationStatus.ACCEPTED),
      rejections: countFor(ApplicationStatus.REJECTED),
    },
    // Every status in pipeline order, including zeros, so the chart layout is stable.
    statusBreakdown: applicationStatuses.map(({ value, label }) => ({
      status: value,
      label,
      count: countFor(value),
    })),
    recentApplications,
    upcomingInterviews,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
