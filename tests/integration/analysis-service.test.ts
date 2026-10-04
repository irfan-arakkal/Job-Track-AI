import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisResult } from "@/features/analysis/schemas";
import type { ResumeAnalyzer } from "@/server/ai/resume-analyzer";
import { AppError, NotFoundError, ValidationError } from "@/server/errors";
import { resetRateLimits } from "@/server/rate-limit";
import { analyzeResume, getAnalysis, listAnalyses } from "@/server/services/analysis";

import { db, factory, resetDatabase } from "../support/db";

const JOB_DESCRIPTION =
  "We are hiring a Frontend Engineer with strong React, TypeScript and Next.js skills. You will build accessible UI, write tests and work with PostgreSQL-backed APIs.";

const goodResult: AnalysisResult = {
  matchScore: 78,
  summary: "Strong React and TypeScript background; limited testing experience.",
  matchingSkills: ["React", "TypeScript"],
  missingSkills: ["Automated testing"],
  relevantExperience: ["Built a Next.js job tracker"],
  weakAreas: ["No metrics on impact"],
  resumeSuggestions: ["Quantify achievements"],
  tailoringSuggestions: ["Mention accessibility work"],
};

const fakeAnalyzer = (output: unknown = goodResult) =>
  vi.fn<ResumeAnalyzer>(async () => ({ output, model: "claude-test" }));

async function userWithResume(
  text = "Jane Developer. React, TypeScript and Next.js for three years. Built accessible apps.",
) {
  const user = await factory.user();
  const resume = await factory.resume(user.id, true);
  await db.resume.update({ where: { id: resume.id }, data: { extractedText: text } });
  return { user, resume };
}

describe("analyzeResume", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  it("uses the primary resume, calls the analyzer and stores the validated result", async () => {
    const { user, resume } = await userWithResume();
    const analyzer = fakeAnalyzer();

    const created = await analyzeResume(
      user.id,
      { jobDescription: JOB_DESCRIPTION, jobTitle: "Frontend" },
      analyzer,
    );

    expect(analyzer).toHaveBeenCalledWith(
      expect.objectContaining({ jobDescription: JOB_DESCRIPTION, jobTitle: "Frontend" }),
    );
    expect(created.matchScore).toBe(78);
    const stored = await getAnalysis(user.id, created.id);
    expect(stored?.resume.id).toBe(resume.id);
    expect(stored?.result).toEqual(goodResult);
    expect(stored?.model).toBe("claude-test");
  });

  it("uses the application's job description when none is pasted", async () => {
    const { user } = await userWithResume();
    const company = await factory.company(user.id);
    const app = await db.application.create({
      data: {
        userId: user.id,
        companyId: company.id,
        jobTitle: "React Dev",
        jobDescription: JOB_DESCRIPTION,
      },
    });
    const analyzer = fakeAnalyzer();

    const created = await analyzeResume(user.id, { applicationId: app.id }, analyzer);

    expect(analyzer.mock.calls[0][0]).toMatchObject({
      jobDescription: JOB_DESCRIPTION,
      jobTitle: "React Dev",
    });
    expect((await getAnalysis(user.id, created.id))?.application?.id).toBe(app.id);
  });

  it.each([
    ["a score above 100", { ...goodResult, matchScore: 140 }],
    ["a missing summary", { ...goodResult, summary: "" }],
    ["a wrong shape", { score: "high" }],
    ["too many items", { ...goodResult, weakAreas: Array.from({ length: 40 }, (_, i) => `w${i}`) }],
  ])("rejects an AI answer with %s and stores nothing", async (_name, output) => {
    const { user } = await userWithResume();
    await expect(
      analyzeResume(user.id, { jobDescription: JOB_DESCRIPTION }, fakeAnalyzer(output)),
    ).rejects.toMatchObject({ status: 502 });
    expect(await db.resumeAnalysis.count()).toBe(0);
  });

  it("won't analyse another user's resume or application", async () => {
    const { user } = await userWithResume();
    const other = await userWithResume();
    const otherCompany = await factory.company(other.user.id);
    const otherApp = await db.application.create({
      data: {
        userId: other.user.id,
        companyId: otherCompany.id,
        jobTitle: "x",
        jobDescription: JOB_DESCRIPTION,
      },
    });
    const analyzer = fakeAnalyzer();

    await expect(
      analyzeResume(
        user.id,
        { resumeId: other.resume.id, jobDescription: JOB_DESCRIPTION },
        analyzer,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      analyzeResume(user.id, { applicationId: otherApp.id }, analyzer),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(analyzer).not.toHaveBeenCalled();
  });

  it("explains what's missing before calling the AI", async () => {
    const noResume = await factory.user();
    await expect(
      analyzeResume(noResume.id, { jobDescription: JOB_DESCRIPTION }, fakeAnalyzer()),
    ).rejects.toBeInstanceOf(ValidationError);

    const { user } = await userWithResume("too short");
    await expect(
      analyzeResume(user.id, { jobDescription: JOB_DESCRIPTION }, fakeAnalyzer()),
    ).rejects.toThrow(/couldn't read enough text/);
  });

  it("limits each user to 20 analyses per day", async () => {
    const { user } = await userWithResume();
    const analyzer = fakeAnalyzer();
    for (let i = 0; i < 20; i++)
      await analyzeResume(user.id, { jobDescription: JOB_DESCRIPTION }, analyzer);
    await expect(
      analyzeResume(user.id, { jobDescription: JOB_DESCRIPTION }, analyzer),
    ).rejects.toMatchObject({ status: 429 });
    expect(await listAnalyses(user.id)).toHaveLength(20);
  });

  it("passes through errors from the AI layer unchanged", async () => {
    const { user } = await userWithResume();
    const failing: ResumeAnalyzer = async () => {
      throw new AppError(
        "The AI took too long to respond. Please try again.",
        "UPSTREAM_ERROR",
        504,
      );
    };
    await expect(
      analyzeResume(user.id, { jobDescription: JOB_DESCRIPTION }, failing),
    ).rejects.toMatchObject({
      status: 504,
    });
  });
});
