import "server-only";

import type {
  InterviewInput,
  InterviewListQuery,
  InterviewPatch,
} from "@/features/interviews/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { parseDateTimeInput } from "@/lib/timezone";
import { db } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";

/*
 * Interview service. Same rules as the application service: userId first, scoped queries,
 * someone else's record = NotFoundError. Times arrive as the user's wall-clock time and are
 * converted to UTC here, using the user's saved time zone.
 */

const include = {
  application: { select: { id: true, jobTitle: true, company: { select: { name: true } } } },
} satisfies Prisma.InterviewInclude;

function toUtc(value: string, timeZone: string) {
  const date = parseDateTimeInput(value, timeZone);
  if (Number.isNaN(date.getTime())) throw new ValidationError("Choose a valid date and time.");
  return date;
}

async function assertOwnedApplication(userId: string, applicationId: string) {
  const found = await db.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!found) throw new NotFoundError("Application");
}

export async function listInterviews(
  userId: string,
  query: Partial<InterviewListQuery> = {},
  now = new Date(),
) {
  const { view = "upcoming", status, from, to } = query;
  const scheduledAt: Prisma.DateTimeFilter = {};
  if (view === "upcoming") scheduledAt.gte = now;
  if (view === "past") scheduledAt.lt = now;
  if (from) scheduledAt.gte = new Date(from);
  if (to) scheduledAt.lte = new Date(to);

  return db.interview.findMany({
    where: { userId, ...(status ? { status } : {}), scheduledAt },
    // Upcoming: soonest first. Past: most recent first.
    orderBy: { scheduledAt: view === "past" ? "desc" : "asc" },
    include,
    take: 200,
  });
}

export async function getInterview(userId: string, interviewId: string) {
  return db.interview.findFirst({ where: { id: interviewId, userId }, include });
}

export async function createInterview(userId: string, timeZone: string, input: InterviewInput) {
  await assertOwnedApplication(userId, input.applicationId);
  return db.interview.create({
    data: { ...input, userId, scheduledAt: toUtc(input.scheduledAt, timeZone) },
    include,
  });
}

export async function updateInterview(
  userId: string,
  timeZone: string,
  interviewId: string,
  patch: InterviewPatch,
) {
  const existing = await db.interview.findFirst({
    where: { id: interviewId, userId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Interview");
  if (patch.applicationId) await assertOwnedApplication(userId, patch.applicationId);

  const { scheduledAt, ...rest } = patch;
  return db.interview.update({
    where: { id: interviewId },
    data: { ...rest, ...(scheduledAt ? { scheduledAt: toUtc(scheduledAt, timeZone) } : {}) },
    include,
  });
}

export async function deleteInterview(userId: string, interviewId: string) {
  const { count } = await db.interview.deleteMany({ where: { id: interviewId, userId } });
  if (count === 0) throw new NotFoundError("Interview");
}

/** Application choices for the interview form (most recently updated first). */
export async function listApplicationOptions(userId: string) {
  return db.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, jobTitle: true, company: { select: { name: true } } },
    take: 500,
  });
}

export type InterviewWithApplication = NonNullable<Awaited<ReturnType<typeof getInterview>>>;
