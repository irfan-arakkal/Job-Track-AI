import { z } from "zod";

import { ApplicationStatus, currencies, WorkMode } from "@/lib/applications";

/*
 * Validation for application input. The SAME schema runs in the browser (instant feedback) and
 * on the server (the real check), and handles both form values (always strings) and JSON from
 * the REST API (numbers, null).
 *
 * Convention: an empty value becomes `null`, meaning "clear this field".
 */

const emptyToNull = (value: unknown) =>
  value === "" || value === undefined || value === null ? null : value;

const optionalText = (max: number) =>
  z.preprocess(
    (v) => emptyToNull(typeof v === "string" ? v.trim() : v),
    z.string().max(max, `Must be at most ${max} characters.`).nullable(),
  );

const optionalUrl = z.preprocess(
  (v) => emptyToNull(typeof v === "string" ? v.trim() : v),
  z
    .url({ protocol: /^https?$/, error: "Enter a full link starting with http:// or https://" })
    .max(2048)
    .nullable(),
);

const optionalMoney = z.preprocess(
  (v) => {
    const value = emptyToNull(typeof v === "string" ? v.replace(/[,\s]/g, "") : v);
    return value === null ? null : Number(value);
  },
  z
    .number({ error: "Enter a number." })
    .int("Use whole numbers.")
    .min(0, "Can't be negative.")
    .max(1_000_000_000, "That number is too large.")
    .nullable(),
);

/** Accepts "2026-03-04" (date inputs) or a full ISO string, stores midnight UTC of that day. */
const optionalDate = z.preprocess(
  (v) => emptyToNull(v),
  z
    .union([z.iso.date(), z.iso.datetime({ offset: true })], { error: "Enter a valid date." })
    .transform((value) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
    .nullable(),
);

export const applicationInputSchema = z
  .object({
    companyName: z
      .string({ error: "Enter the company name." })
      .trim()
      .min(1, "Enter the company name.")
      .max(200, "Must be at most 200 characters."),
    jobTitle: z
      .string({ error: "Enter the job title." })
      .trim()
      .min(1, "Enter the job title.")
      .max(200, "Must be at most 200 characters."),
    jobUrl: optionalUrl,
    location: optionalText(200),
    workMode: z.preprocess(emptyToNull, z.enum(WorkMode).nullable()),
    salaryMin: optionalMoney,
    salaryMax: optionalMoney,
    salaryCurrency: z.preprocess(
      (v) => emptyToNull(typeof v === "string" ? v.trim().toUpperCase() : v),
      z.enum(currencies, { error: "Choose a currency." }).nullable(),
    ),
    status: z.enum(ApplicationStatus).default(ApplicationStatus.APPLIED),
    appliedAt: optionalDate,
    followUpAt: optionalDate,
    jobDescription: optionalText(20_000),
  })
  .superRefine((value, ctx) => {
    if (value.salaryMin != null && value.salaryMax != null && value.salaryMin > value.salaryMax) {
      ctx.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message: "Maximum must be greater than or equal to minimum.",
      });
    }
    if ((value.salaryMin != null || value.salaryMax != null) && value.salaryCurrency == null) {
      ctx.addIssue({ code: "custom", path: ["salaryCurrency"], message: "Choose a currency." });
    }
  });

/** For PATCH requests: every field optional; omitted fields stay unchanged. */
export const applicationPatchSchema = z
  .object({
    companyName: z.string().trim().min(1).max(200),
    jobTitle: z.string().trim().min(1).max(200),
    jobUrl: optionalUrl,
    location: optionalText(200),
    workMode: z.preprocess(emptyToNull, z.enum(WorkMode).nullable()),
    salaryMin: optionalMoney,
    salaryMax: optionalMoney,
    salaryCurrency: z.preprocess(
      (v) => emptyToNull(typeof v === "string" ? v.trim().toUpperCase() : v),
      z.enum(currencies).nullable(),
    ),
    status: z.enum(ApplicationStatus),
    appliedAt: optionalDate,
    followUpAt: optionalDate,
    jobDescription: optionalText(20_000),
  })
  .partial()
  .strict();

export const statusChangeSchema = z.object({ status: z.enum(ApplicationStatus) });

export const noteInputSchema = z.object({
  content: z
    .string({ error: "Write a note first." })
    .trim()
    .min(1, "Write a note first.")
    .max(5000, "Notes can be at most 5000 characters."),
});

export const applicationListQuerySchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  status: z.enum(ApplicationStatus).optional().catch(undefined),
  sort: z.enum(["updated", "applied", "company"]).default("updated").catch("updated"),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
});

/** Raw form values — what the inputs hold (always strings) — and the parsed, typed result. */
export type ApplicationFormValues = {
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  workMode?: string;
  salaryMin?: string;
  salaryMax?: string;
  salaryCurrency?: string;
  status?: string;
  appliedAt?: string;
  followUpAt?: string;
  jobDescription?: string;
};
export type ApplicationInput = z.output<typeof applicationInputSchema>;
export type ApplicationPatch = z.output<typeof applicationPatchSchema>;
export type ApplicationListQuery = z.output<typeof applicationListQuerySchema>;
