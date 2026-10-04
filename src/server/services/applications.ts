import "server-only";

import { db } from "@/server/db";

/*
 * Application service — the only place that reads or writes applications.
 *
 * Every function takes the signed-in user's id as its FIRST argument and puts it in the
 * `where` clause. Callers get it from `requireUser()`, never from the request body or URL.
 * A record that exists but belongs to someone else is treated exactly like a missing one
 * (null → 404), so we never reveal that it exists.
 *
 * Phase 3 provides the reads; Phase 4 adds create, update, delete and status changes.
 */

/** All of the user's applications, most recently updated first. */
export async function listApplications(userId: string) {
  return db.application.findMany({
    where: { userId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

/** One application with its related records, or null if it doesn't exist for this user. */
export async function getApplication(userId: string, applicationId: string) {
  return db.application.findFirst({
    // Both conditions: the id alone would let anyone read any application by guessing ids.
    where: { id: applicationId, userId },
    include: {
      company: true,
      resume: { select: { id: true, label: true } },
      interviews: { orderBy: { scheduledAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      statusChanges: { orderBy: { changedAt: "asc" } },
    },
  });
}

export type ApplicationListItem = Awaited<ReturnType<typeof listApplications>>[number];
export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;
