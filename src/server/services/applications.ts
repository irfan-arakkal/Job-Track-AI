import "server-only";

import type {
  ApplicationInput,
  ApplicationListQuery,
  ApplicationPatch,
} from "@/features/applications/schemas";
import { ApplicationStatus, type Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";

/*
 * Application service — the only place that reads or writes applications and their notes.
 *
 * Rules every function follows:
 *  - The signed-in user's id is the FIRST argument, and it goes into every `where` clause.
 *    Callers get it from the session (`requireUser()`), never from the request body or URL.
 *  - A record that belongs to someone else is treated exactly like a missing one
 *    (NotFoundError → 404), so we never reveal that it exists.
 *  - Input arrives already validated by Zod; the service enforces business rules.
 */

type Tx = Prisma.TransactionClient;

const todayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

/** Reuses the user's company with the same name (ignoring case), or creates it. */
async function findOrCreateCompany(tx: Tx, userId: string, name: string) {
  const existing = await tx.company.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.company.create({ data: { userId, name }, select: { id: true } });
  return created.id;
}

/** Throws unless the application exists AND belongs to the user. */
async function assertOwnedApplication(tx: Tx, userId: string, applicationId: string) {
  const application = await tx.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true, status: true, appliedAt: true, salaryMin: true, salaryMax: true },
  });
  if (!application) throw new NotFoundError("Application");
  return application;
}

/** Applied date rule: anything past the wishlist needs an applied date — default to today. */
function resolveAppliedAt(status: ApplicationStatus, appliedAt: Date | null | undefined) {
  if (appliedAt) return appliedAt;
  return status === ApplicationStatus.WISHLIST ? null : todayUtc();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listApplications(userId: string, query: Partial<ApplicationListQuery> = {}) {
  const { q, status, sort = "updated", page = 1, pageSize = 20 } = query;

  const where: Prisma.ApplicationWhereInput = {
    userId,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { jobTitle: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
    sort === "applied"
      ? [{ appliedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
      : sort === "company"
        ? [{ company: { name: "asc" } }, { jobTitle: "asc" }]
        : [{ updatedAt: "desc" }];

  // Two queries in one round trip: the page of rows and the total count for pagination.
  const [items, total] = await db.$transaction([
    db.application.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { company: { select: { id: true, name: true } } },
    }),
    db.application.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
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

/** Like getApplication, but throws NotFoundError — convenient for API routes. */
export async function getApplicationOrThrow(userId: string, applicationId: string) {
  const application = await getApplication(userId, applicationId);
  if (!application) throw new NotFoundError("Application");
  return application;
}

/** The user's companies matching a search, for autocomplete. */
export async function searchCompanies(userId: string, q = "") {
  return db.company.findMany({
    where: { userId, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true },
  });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createApplication(userId: string, input: ApplicationInput) {
  return db.$transaction(async (tx) => {
    const { companyName, ...fields } = input;
    const companyId = await findOrCreateCompany(tx, userId, companyName);
    return tx.application.create({
      data: {
        ...fields,
        userId,
        companyId,
        appliedAt: resolveAppliedAt(input.status, input.appliedAt),
        // The first history entry records the starting status.
        statusChanges: { create: { fromStatus: null, toStatus: input.status } },
      },
      include: { company: { select: { id: true, name: true } } },
    });
  });
}

export async function updateApplication(
  userId: string,
  applicationId: string,
  patch: ApplicationPatch,
) {
  return db.$transaction(async (tx) => {
    const current = await assertOwnedApplication(tx, userId, applicationId);
    const { companyName, ...fields } = patch;

    // Validate the salary range against the *merged* values (a PATCH may send only one side).
    const salaryMin = fields.salaryMin !== undefined ? fields.salaryMin : current.salaryMin;
    const salaryMax = fields.salaryMax !== undefined ? fields.salaryMax : current.salaryMax;
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      throw new ValidationError("Maximum salary must be greater than or equal to minimum.");
    }

    const nextStatus = fields.status ?? current.status;
    const statusChanged = nextStatus !== current.status;
    const appliedAt =
      fields.appliedAt !== undefined
        ? resolveAppliedAt(nextStatus, fields.appliedAt)
        : resolveAppliedAt(nextStatus, current.appliedAt);

    return tx.application.update({
      where: { id: applicationId },
      data: {
        ...fields,
        appliedAt,
        ...(companyName
          ? { company: { connect: { id: await findOrCreateCompany(tx, userId, companyName) } } }
          : {}),
        ...(statusChanged
          ? { statusChanges: { create: { fromStatus: current.status, toStatus: nextStatus } } }
          : {}),
      },
      include: { company: { select: { id: true, name: true } } },
    });
  });
}

/** Quick status change (e.g. from the list or detail page). Records history. */
export async function changeApplicationStatus(
  userId: string,
  applicationId: string,
  status: ApplicationStatus,
) {
  return updateApplication(userId, applicationId, { status });
}

export async function deleteApplication(userId: string, applicationId: string) {
  // deleteMany with both conditions: deletes nothing (count 0) if the id isn't the user's.
  const { count } = await db.application.deleteMany({ where: { id: applicationId, userId } });
  if (count === 0) throw new NotFoundError("Application");
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function listNotes(userId: string, applicationId: string) {
  await assertOwnedApplication(db, userId, applicationId);
  return db.note.findMany({ where: { applicationId, userId }, orderBy: { createdAt: "desc" } });
}

export async function addNote(userId: string, applicationId: string, content: string) {
  return db.$transaction(async (tx) => {
    await assertOwnedApplication(tx, userId, applicationId);
    const note = await tx.note.create({ data: { userId, applicationId, content } });
    // Touch the application so "recently updated" sorting reflects new activity.
    await tx.application.update({ where: { id: applicationId }, data: { updatedAt: new Date() } });
    return note;
  });
}

export async function updateNote(userId: string, noteId: string, content: string) {
  const { count } = await db.note.updateMany({ where: { id: noteId, userId }, data: { content } });
  if (count === 0) throw new NotFoundError("Note");
  return db.note.findUniqueOrThrow({ where: { id: noteId } });
}

export async function deleteNote(userId: string, noteId: string) {
  const { count } = await db.note.deleteMany({ where: { id: noteId, userId } });
  if (count === 0) throw new NotFoundError("Note");
}

export type ApplicationListResult = Awaited<ReturnType<typeof listApplications>>;
export type ApplicationListItem = ApplicationListResult["items"][number];
export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;
