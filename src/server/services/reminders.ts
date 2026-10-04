import "server-only";

import { ReminderStatus } from "@/generated/prisma/client";
import { interviewTypeLabel } from "@/lib/interviews";
import { computeReminders } from "@/lib/reminders";
import { db } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * Brings one user's reminders up to date:
 *  - creates reminders for situations that apply now (idempotent via dedupeKey),
 *  - marks PENDING reminders whose situation no longer applies as DONE
 *    (e.g. the company replied, or the interview was cancelled).
 * Safe to run any number of times — from the daily job or when the dashboard loads.
 */
export async function syncRemindersForUser(userId: string, now = new Date()) {
  const [user, applications, interviews] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
    db.application.findMany({
      where: { userId, OR: [{ status: "APPLIED" }, { followUpAt: { not: null } }] },
      select: {
        id: true,
        jobTitle: true,
        status: true,
        appliedAt: true,
        followUpAt: true,
        company: { select: { name: true } },
      },
    }),
    db.interview.findMany({
      where: {
        userId,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: new Date(now.getTime() + 3 * 86_400_000) },
      },
      select: {
        id: true,
        applicationId: true,
        scheduledAt: true,
        status: true,
        type: true,
        application: { select: { company: { select: { name: true } } } },
      },
    }),
  ]);

  const candidates = computeReminders({
    now,
    timeZone: user.timezone,
    applications: applications.map((a) => ({ ...a, companyName: a.company.name })),
    interviews: interviews.map((i) => ({
      ...i,
      typeLabel: interviewTypeLabel[i.type],
      companyName: i.application.company.name,
    })),
  });

  const [created, resolved] = await db.$transaction([
    db.reminder.createMany({
      data: candidates.map((c) => ({ ...c, userId })),
      skipDuplicates: true, // dedupeKey is unique → existing reminders (even dismissed) are kept
    }),
    db.reminder.updateMany({
      where: {
        userId,
        status: ReminderStatus.PENDING,
        dedupeKey: { notIn: candidates.map((c) => c.dedupeKey) },
      },
      data: { status: ReminderStatus.DONE },
    }),
  ]);
  return { created: created.count, resolved: resolved.count };
}

/** Runs the sync for every user, in small batches (the daily job). */
export async function syncAllReminders(now = new Date()) {
  let cursor: string | undefined;
  let users = 0;
  let created = 0;
  let failed = 0;
  for (;;) {
    const batch = await db.user.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    for (const { id } of batch) {
      try {
        created += (await syncRemindersForUser(id, now)).created;
        users += 1;
      } catch (error) {
        // One user's failure must not stop the job for everyone else.
        failed += 1;
        logger.error("Reminder sync failed for user", { userId: id, error });
      }
    }
    cursor = batch[batch.length - 1].id;
  }
  return { users, created, failed };
}

export async function listReminders(
  userId: string,
  status: ReminderStatus = ReminderStatus.PENDING,
) {
  return db.reminder.findMany({
    where: { userId, status },
    orderBy: { dueAt: "asc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      dueAt: true,
      status: true,
      applicationId: true,
      interviewId: true,
    },
  });
}

export async function countPendingReminders(userId: string) {
  return db.reminder.count({ where: { userId, status: ReminderStatus.PENDING } });
}

export async function setReminderStatus(
  userId: string,
  reminderId: string,
  status: "DONE" | "DISMISSED",
) {
  const { count } = await db.reminder.updateMany({
    where: { id: reminderId, userId },
    data: { status },
  });
  if (count === 0) throw new NotFoundError("Reminder");
}

export type ReminderItem = Awaited<ReturnType<typeof listReminders>>[number];
