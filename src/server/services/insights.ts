import "server-only";

import { ApplicationStatus } from "@/generated/prisma/client";
import { db } from "@/server/db";

/*
 * Read-only insights used by the AI assistant, the MCP server and reminders.
 * Every query is scoped to the user.
 */

const DAY = 86_400_000;

export type FollowUpCandidate = {
  id: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  daysSinceLastUpdate: number;
  reason: "no_response" | "follow_up_due";
};

/**
 * Applications worth following up on:
 *  - "no_response": status still APPLIED, applied at least `days` ago, and no status change since;
 *  - "follow_up_due": a follow-up date the user set that is today or earlier (active statuses).
 */
export async function getFollowUpCandidates(userId: string, days = 7, now = new Date()) {
  const cutoff = new Date(now.getTime() - days * DAY);
  const active: ApplicationStatus[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"];

  const [noResponse, followUpDue] = await Promise.all([
    db.application.findMany({
      where: {
        userId,
        // Still "Applied" this long after applying = the company hasn't responded.
        status: ApplicationStatus.APPLIED,
        appliedAt: { lte: cutoff },
      },
      orderBy: { appliedAt: "asc" },
      take: 50,
      include: {
        company: { select: { name: true } },
        statusChanges: { orderBy: { changedAt: "desc" }, take: 1 },
      },
    }),
    db.application.findMany({
      where: { userId, status: { in: active }, followUpAt: { lte: now } },
      orderBy: { followUpAt: "asc" },
      take: 50,
      include: {
        company: { select: { name: true } },
        statusChanges: { orderBy: { changedAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const toCandidate = (
    app: (typeof noResponse)[number],
    reason: FollowUpCandidate["reason"],
  ): FollowUpCandidate => {
    const lastActivity = app.statusChanges[0]?.changedAt ?? app.appliedAt ?? app.createdAt;
    return {
      id: app.id,
      jobTitle: app.jobTitle,
      company: app.company.name,
      status: app.status,
      appliedAt: app.appliedAt?.toISOString().slice(0, 10) ?? null,
      daysSinceLastUpdate: Math.floor((now.getTime() - lastActivity.getTime()) / DAY),
      reason,
    };
  };

  const seen = new Set<string>();
  const results: FollowUpCandidate[] = [];
  for (const app of followUpDue) {
    seen.add(app.id);
    results.push(toCandidate(app, "follow_up_due"));
  }
  for (const app of noResponse) {
    if (!seen.has(app.id)) results.push(toCandidate(app, "no_response"));
  }
  return results;
}

/** Headline numbers for a period (default: everything). Rates are percentages of applications
 * that were actually sent (wishlist excluded). */
export async function getStatistics(userId: string, range: { from?: Date; to?: Date } = {}) {
  const appliedAt = range.from || range.to ? { gte: range.from, lte: range.to } : undefined;
  const where = { userId, ...(appliedAt ? { appliedAt } : {}) };

  const [byStatus, interviewCount, upcomingInterviews] = await Promise.all([
    db.application.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.interview.count({ where: { userId, application: where } }),
    db.interview.count({
      where: { userId, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    }),
  ]);

  const count = (status: ApplicationStatus) =>
    byStatus.find((r) => r.status === status)?._count._all ?? 0;
  const total = byStatus.reduce((sum, r) => sum + r._count._all, 0);
  const sent = total - count("WISHLIST");

  // Rates use the status HISTORY: an application that reached "Interview" and was later
  // rejected still counts as having had an interview.
  const reachedIds = async (statuses: ApplicationStatus[]) =>
    new Set(
      (
        await db.statusChange.findMany({
          where: { toStatus: { in: statuses }, application: where },
          select: { applicationId: true },
          distinct: ["applicationId"],
        })
      ).map((r) => r.applicationId),
    ).size;

  const [responded, interviewed, offered] = await Promise.all([
    reachedIds(["SCREENING", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED"]),
    reachedIds(["INTERVIEW", "OFFER", "ACCEPTED"]),
    reachedIds(["OFFER", "ACCEPTED"]),
  ]);
  const pct = (n: number) => (sent === 0 ? 0 : Math.round((n / sent) * 1000) / 10);

  return {
    totalApplications: total,
    sentApplications: sent,
    byStatus: Object.fromEntries(Object.values(ApplicationStatus).map((s) => [s, count(s)])),
    interviews: interviewCount,
    upcomingInterviews,
    responseRatePercent: pct(responded),
    interviewRatePercent: pct(interviewed),
    offerRatePercent: pct(offered),
    rejectionRatePercent: pct(count("REJECTED")),
  };
}
