import { z } from "zod";

/** What the user submits to start an analysis. */
export const analysisRequestSchema = z
  .object({
    resumeId: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
    applicationId: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
    jobTitle: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(200).optional(),
    ),
    jobDescription: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .min(100, "Paste the full job description (at least 100 characters).")
        .max(20_000, "The job description is too long (max 20,000 characters).")
        .optional(),
    ),
  })
  .refine((v) => v.jobDescription || v.applicationId, {
    message: "Paste a job description or choose an application that has one.",
    path: ["jobDescription"],
  });

export type AnalysisRequest = z.output<typeof analysisRequestSchema>;

/**
 * The shape we ask Claude to return (sent as a JSON schema via structured outputs, so the
 * response is guaranteed to parse). Descriptions guide the model.
 */
export const analysisModelOutputSchema = z.object({
  // Bounds the API can't enforce are passed to the model as hints by the SDK; we enforce them
  // ourselves in analysisResultSchema below.
  matchScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "Overall fit from 0 (no fit) to 100 (excellent fit), using the rubric in the instructions.",
    ),
  summary: z
    .string()
    .describe("Two or three sentences: the honest bottom line for this candidate."),
  matchingSkills: z
    .array(z.string())
    .describe("Skills required by the job that the resume clearly shows."),
  missingSkills: z
    .array(z.string())
    .describe("Skills or qualifications the job asks for that the resume lacks."),
  relevantExperience: z
    .array(z.string())
    .describe(
      "Specific roles, projects or achievements from the resume that are relevant to this job.",
    ),
  weakAreas: z.array(z.string()).describe("Parts of the resume that weaken this application."),
  resumeSuggestions: z
    .array(z.string())
    .describe("Concrete edits to the resume itself, each actionable in one sitting."),
  tailoringSuggestions: z
    .array(z.string())
    .describe(
      "How to tailor this specific application: keywords, cover letter angles, interview prep.",
    ),
});

const item = z.string().trim().min(1).max(600);
const list = z.array(item).max(15);

/**
 * The stricter check we run on the model's answer BEFORE storing or showing it. Structured
 * outputs guarantee valid JSON of the right shape; this guarantees sensible values (score in
 * range, non-empty summary, bounded list sizes).
 */
export const analysisResultSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(2000),
  matchingSkills: list,
  missingSkills: list,
  relevantExperience: list,
  weakAreas: list,
  resumeSuggestions: list,
  tailoringSuggestions: list,
});

export type AnalysisResult = z.output<typeof analysisResultSchema>;
