import "server-only";

import {
  type AnalysisRequest,
  type AnalysisResult,
  analysisResultSchema,
} from "@/features/analysis/schemas";
import { claudeResumeAnalyzer, type ResumeAnalyzer } from "@/server/ai/resume-analyzer";
import { db } from "@/server/db";
import { AppError, NotFoundError, ValidationError } from "@/server/errors";
import { logger } from "@/server/logger";
import { checkRateLimit } from "@/server/rate-limit";

const DAILY_LIMIT = 20;

/**
 * Runs an AI resume analysis for the user and stores the validated result.
 * The analyzer is injectable so tests can run without calling the real API.
 */
export async function analyzeResume(
  userId: string,
  request: AnalysisRequest,
  analyzer: ResumeAnalyzer = claudeResumeAnalyzer,
) {
  // 1. Resolve the resume: the one asked for, or the primary. Must belong to the user.
  const resume = await db.resume.findFirst({
    where: request.resumeId ? { id: request.resumeId, userId } : { userId, isPrimary: true },
    select: { id: true, extractedText: true },
  });
  if (!resume) {
    throw request.resumeId
      ? new NotFoundError("Resume")
      : new ValidationError("Upload a resume first — it's needed for the analysis.");
  }
  if (!resume.extractedText || resume.extractedText.length < 50) {
    throw new ValidationError(
      "We couldn't read enough text from this resume (scanned PDFs aren't supported yet).",
    );
  }

  // 2. Resolve the job description: pasted text wins; otherwise the application's.
  let application: { id: string; jobTitle: string; jobDescription: string | null } | null = null;
  if (request.applicationId) {
    application = await db.application.findFirst({
      where: { id: request.applicationId, userId },
      select: { id: true, jobTitle: true, jobDescription: true },
    });
    if (!application) throw new NotFoundError("Application");
  }
  const jobDescription = request.jobDescription ?? application?.jobDescription ?? null;
  if (!jobDescription || jobDescription.trim().length < 100) {
    throw new ValidationError("That application has no job description yet. Paste one instead.");
  }
  const jobTitle = request.jobTitle ?? application?.jobTitle ?? null;

  // 3. Cost control: limit analyses per user per day (checked after cheap validation).
  await checkRateLimit(`analysis:${userId}`, DAILY_LIMIT, 24 * 60 * 60 * 1000);

  // 4. Call the AI, then validate its answer before trusting it.
  const { output, model } = await analyzer({
    resumeText: resume.extractedText,
    jobDescription,
    jobTitle,
  });
  const parsed = analysisResultSchema.safeParse(output);
  if (!parsed.success) {
    logger.warn("AI analysis failed validation", { issues: parsed.error.issues.slice(0, 5) });
    throw new AppError(
      "The AI returned an unexpected answer. Please try again.",
      "UPSTREAM_ERROR",
      502,
    );
  }

  return db.resumeAnalysis.create({
    data: {
      userId,
      resumeId: resume.id,
      applicationId: application?.id ?? null,
      jobTitle,
      jobDescription,
      matchScore: parsed.data.matchScore,
      result: parsed.data,
      model,
    },
    select: { id: true, matchScore: true },
  });
}

export async function listAnalyses(userId: string) {
  return db.resumeAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      matchScore: true,
      jobTitle: true,
      createdAt: true,
      resume: { select: { label: true } },
      application: { select: { id: true, company: { select: { name: true } } } },
    },
  });
}

export async function getAnalysis(userId: string, analysisId: string) {
  const analysis = await db.resumeAnalysis.findFirst({
    where: { id: analysisId, userId },
    include: {
      resume: { select: { id: true, label: true } },
      application: { select: { id: true, jobTitle: true, company: { select: { name: true } } } },
    },
  });
  if (!analysis) return null;
  // Stored results were validated on write; re-parse to get a typed object (and to be safe if
  // the schema evolves).
  const result = analysisResultSchema.safeParse(analysis.result);
  return { ...analysis, result: result.success ? (result.data as AnalysisResult) : null };
}

export async function deleteAnalysis(userId: string, analysisId: string) {
  const { count } = await db.resumeAnalysis.deleteMany({ where: { id: analysisId, userId } });
  if (count === 0) throw new NotFoundError("Analysis");
}

export type AnalysisDetail = NonNullable<Awaited<ReturnType<typeof getAnalysis>>>;
