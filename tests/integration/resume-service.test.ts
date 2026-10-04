import { readdir, rm } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { AppError, NotFoundError, ValidationError } from "@/server/errors";
import * as service from "@/server/services/resumes";

import { db, factory, resetDatabase } from "../support/db";
import { makePdf } from "../support/pdf";

// Set to a throwaway temp folder for integration tests in vitest.config.ts.
const storageDir = process.env.STORAGE_LOCAL_DIR!;

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
});

const pdf = (lines = ["Jane Developer", "React and TypeScript"]) => ({
  fileName: "Jane CV.pdf",
  mimeType: "application/pdf",
  bytes: makePdf(lines),
});

async function storedFiles(userId: string) {
  try {
    return await readdir(path.join(storageDir, "resumes", userId));
  } catch {
    return [];
  }
}

describe("resume service", () => {
  beforeEach(resetDatabase);

  it("stores the file privately, extracts text and makes the first resume primary", async () => {
    const user = await factory.user();
    const first = await service.uploadResume(user.id, pdf());
    const second = await service.uploadResume(user.id, { ...pdf(), label: "Backend version" });

    expect(first.isPrimary).toBe(true);
    expect(second.isPrimary).toBe(false);
    expect(second.label).toBe("Backend version");
    expect(first.label).toBe("Jane CV");
    expect(await storedFiles(user.id)).toHaveLength(2);

    const row = await db.resume.findUniqueOrThrow({ where: { id: first.id } });
    expect(row.extractedText).toContain("React and TypeScript");
    expect(row.storageKey).toMatch(new RegExp(`^resumes/${user.id}/[0-9a-f-]{36}\\.pdf$`));
  });

  it.each([
    ["an empty file", { bytes: new Uint8Array() }, ValidationError],
    ["a non-PDF type", { mimeType: "image/png", fileName: "cv.png" }, AppError],
    ["a renamed non-PDF", { bytes: new TextEncoder().encode("MZ not a pdf") }, AppError],
    ["a broken PDF", { bytes: new TextEncoder().encode("%PDF-1.4 broken") }, ValidationError],
  ])("rejects %s", async (_name, overrides, errorType) => {
    const user = await factory.user();
    await expect(service.uploadResume(user.id, { ...pdf(), ...overrides })).rejects.toBeInstanceOf(
      errorType,
    );
    expect(await storedFiles(user.id)).toHaveLength(0);
  });

  it("rejects files over 5 MB with status 413", async () => {
    const user = await factory.user();
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(makePdf(["x"]));
    await expect(service.uploadResume(user.id, { ...pdf(), bytes: big })).rejects.toMatchObject({
      status: 413,
    });
  });

  it("refuses uploads with a clear 503 on a serverless host without S3", async () => {
    const user = await factory.user();
    process.env.VERCEL = "1";
    try {
      await expect(service.uploadResume(user.id, pdf())).rejects.toMatchObject({
        status: 503,
        message: "Resume uploads aren't set up on this deployment yet.",
      });
    } finally {
      delete process.env.VERCEL;
    }
    expect(await storedFiles(user.id)).toHaveLength(0);
  });

  it("sanitizes file names", () => {
    expect(service.sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(service.sanitizeFileName('my "cv"<script>.pdf')).toBe("my _cv__script_.pdf");
    expect(service.sanitizeFileName("")).toBe("resume.pdf");
  });

  it("switches the primary resume and promotes another when the primary is deleted", async () => {
    const user = await factory.user();
    const a = await service.uploadResume(user.id, pdf());
    const b = await service.uploadResume(user.id, pdf());

    await service.setPrimaryResume(user.id, b.id);
    let list = await service.listResumes(user.id);
    expect(list.filter((r) => r.isPrimary).map((r) => r.id)).toEqual([b.id]);

    await service.deleteResume(user.id, b.id);
    list = await service.listResumes(user.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, isPrimary: true });
    expect(await storedFiles(user.id)).toHaveLength(1);
  });

  it("never lets another user read, change or delete a resume", async () => {
    const owner = await factory.user();
    const intruder = await factory.user();
    const resume = await service.uploadResume(owner.id, pdf());

    await expect(service.getResumeForDownload(intruder.id, resume.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.setPrimaryResume(intruder.id, resume.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.renameResume(intruder.id, resume.id, "x")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.deleteResume(intruder.id, resume.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await service.listResumes(intruder.id)).toEqual([]);

    const download = await service.getResumeForDownload(owner.id, resume.id);
    expect(Buffer.from(download.bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
