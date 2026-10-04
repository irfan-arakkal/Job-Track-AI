import "server-only";

import { randomUUID } from "node:crypto";

import { RESUME_MAX_BYTES, RESUME_MAX_COUNT } from "@/lib/resumes";
import { db } from "@/server/db";
import { AppError, NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { extractPdfText, hasPdfSignature } from "@/server/pdf";
import { getStorage } from "@/server/storage";

/*
 * Resume service. Files go to private storage under a random key; the database row holds the
 * metadata and the extracted text. Every function is scoped to the owner.
 */

const publicFields = {
  id: true,
  label: true,
  originalFileName: true,
  mimeType: true,
  sizeBytes: true,
  isPrimary: true,
  createdAt: true,
  // Not the storage key (internal) and not the full text (large) — just whether we have it.
  extractedText: false,
} as const;

/** Keeps a display-safe file name: no paths, no control characters, limited length. */
export function sanitizeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "resume.pdf";
  const cleaned = base
    .replace(/[^\w.\- ()]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "resume.pdf").slice(0, 200);
}

export async function listResumes(userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: publicFields,
  });
}

export async function getResumeForDownload(userId: string, resumeId: string) {
  const resume = await db.resume.findFirst({
    where: { id: resumeId, userId },
    select: { storageKey: true, originalFileName: true, mimeType: true },
  });
  if (!resume) throw new NotFoundError("Resume");
  return { ...resume, bytes: await getStorage().get(resume.storageKey) };
}

type UploadInput = { fileName: string; mimeType: string; bytes: Uint8Array; label?: string | null };

export async function uploadResume(userId: string, input: UploadInput) {
  // 1. Validate everything before touching storage.
  if (input.bytes.byteLength === 0) throw new ValidationError("The file is empty.");
  if (input.bytes.byteLength > RESUME_MAX_BYTES) {
    throw new AppError("The file is larger than 5 MB.", "VALIDATION_ERROR", 413);
  }
  const looksLikePdf =
    input.mimeType === "application/pdf" && input.fileName.toLowerCase().endsWith(".pdf");
  // The browser-supplied type and name can be faked, so also check the file's actual bytes.
  if (!looksLikePdf || !hasPdfSignature(input.bytes)) {
    throw new AppError("Only PDF files are supported.", "VALIDATION_ERROR", 415);
  }
  const existing = await db.resume.count({ where: { userId } });
  if (existing >= RESUME_MAX_COUNT) {
    throw new ValidationError(`You can keep up to ${RESUME_MAX_COUNT} resumes. Delete one first.`);
  }

  let extractedText: string;
  try {
    extractedText = (await extractPdfText(input.bytes)).text;
  } catch (error) {
    logger.warn("PDF could not be parsed", { error });
    throw new ValidationError("This PDF couldn't be read. Try exporting it again.");
  }

  // 2. Store the file under a random, unguessable key namespaced by user.
  const fileName = sanitizeFileName(input.fileName);
  const storageKey = `resumes/${userId}/${randomUUID()}.pdf`;
  const storage = getStorage();
  await storage.put(storageKey, input.bytes, "application/pdf");

  // 3. Save metadata. If that fails, remove the orphaned file.
  try {
    return await db.resume.create({
      data: {
        userId,
        label: input.label?.trim().slice(0, 200) || fileName.replace(/\.pdf$/i, ""),
        originalFileName: fileName,
        storageKey,
        mimeType: "application/pdf",
        sizeBytes: input.bytes.byteLength,
        extractedText: extractedText || null,
        // The first resume becomes primary automatically.
        isPrimary: existing === 0,
      },
      select: publicFields,
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

/** Makes one resume primary. Done in a transaction so there's never zero-or-two primaries. */
export async function setPrimaryResume(userId: string, resumeId: string) {
  return db.$transaction(async (tx) => {
    const resume = await tx.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!resume) throw new NotFoundError("Resume");
    // Unset first: the partial unique index forbids two primaries even for a moment.
    await tx.resume.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
    return tx.resume.update({
      where: { id: resumeId },
      data: { isPrimary: true },
      select: publicFields,
    });
  });
}

export async function renameResume(userId: string, resumeId: string, label: string) {
  const { count } = await db.resume.updateMany({
    where: { id: resumeId, userId },
    data: { label },
  });
  if (count === 0) throw new NotFoundError("Resume");
}

export async function deleteResume(userId: string, resumeId: string) {
  const resume = await db.$transaction(async (tx) => {
    const found = await tx.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true, storageKey: true, isPrimary: true },
    });
    if (!found) throw new NotFoundError("Resume");
    await tx.resume.delete({ where: { id: found.id } });
    // Keep a primary if any resumes remain: promote the newest.
    if (found.isPrimary) {
      const next = await tx.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) await tx.resume.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return found;
  });
  // Remove the file after the database change succeeded. A failure here only leaves an
  // orphaned private file (logged), never a database row pointing at a missing file.
  await getStorage()
    .delete(resume.storageKey)
    .catch((error) =>
      logger.error("Failed to delete resume file", { error, key: resume.storageKey }),
    );
}

export type ResumeSummary = Awaited<ReturnType<typeof listResumes>>[number];
