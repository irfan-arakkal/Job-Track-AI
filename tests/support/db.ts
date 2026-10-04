import { db } from "@/server/db";

/** Empties every table (fast, and resets between tests). Only ever run against the test DB. */
export async function resetDatabase() {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("Refusing to reset a database whose URL doesn't contain 'test'.");
  }
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "users", "sessions", "accounts", "verifications", "companies", "applications", "status_changes", "interviews", "notes", "resumes", "resume_analyses", "api_tokens" CASCADE',
  );
}

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

/** Small factories that create valid rows with sensible defaults. */
export const factory = {
  user: (overrides: { name?: string } = {}) => {
    const id = `user-${unique()}`;
    return db.user.create({
      data: { id, name: overrides.name ?? "Test User", email: `${id}@example.com` },
    });
  },
  company: (userId: string, name = `Company ${unique()}`) =>
    db.company.create({ data: { userId, name } }),
  application: (userId: string, companyId: string, jobTitle = "Software Engineer") =>
    db.application.create({ data: { userId, companyId, jobTitle, appliedAt: new Date() } }),
  resume: (userId: string, isPrimary = false) =>
    db.resume.create({
      data: {
        userId,
        label: "My resume",
        originalFileName: "resume.pdf",
        storageKey: `resumes/${userId}/${unique()}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 1024,
        isPrimary,
      },
    }),
};

export { db };
