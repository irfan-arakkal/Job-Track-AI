import { z } from "zod";

import { InterviewStatus, InterviewType } from "@/lib/interviews";

const emptyToNull = (value: unknown) =>
  value === "" || value === undefined || value === null ? null : value;

const optionalText = (max: number) =>
  z.preprocess(
    (v) => emptyToNull(typeof v === "string" ? v.trim() : v),
    z.string().max(max, `Must be at most ${max} characters.`).nullable(),
  );

/**
 * Date-time as typed in a form ("2026-03-05T10:00", the user's own time zone) or sent by the API
 * as ISO with an offset ("2026-03-05T04:30:00Z"). Converted to UTC by the service, which knows
 * the user's time zone.
 */
const dateTimeInput = z
  .string({ error: "Choose a date and time." })
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/,
    "Choose a date and time.",
  );

const fields = {
  applicationId: z.string({ error: "Choose an application." }).min(1, "Choose an application."),
  scheduledAt: dateTimeInput,
  durationMinutes: z.preprocess(
    (v) => {
      const value = emptyToNull(v);
      return value === null ? null : Number(value);
    },
    z
      .number({ error: "Enter a number of minutes." })
      .int("Use whole minutes.")
      .min(5, "At least 5 minutes.")
      .max(24 * 60, "At most 24 hours.")
      .nullable(),
  ),
  type: z.enum(InterviewType).default(InterviewType.OTHER),
  status: z.enum(InterviewStatus).default(InterviewStatus.SCHEDULED),
  interviewerName: optionalText(200),
  meetingUrl: z.preprocess(
    (v) => emptyToNull(typeof v === "string" ? v.trim() : v),
    z
      .url({ protocol: /^https?$/, error: "Enter a full link starting with http:// or https://" })
      .max(2048)
      .nullable(),
  ),
  location: optionalText(200),
  notes: optionalText(10_000),
};

export const interviewInputSchema = z.object(fields);

/** PATCH: all optional, unknown keys rejected (no `userId` smuggling). */
export const interviewPatchSchema = z.object(fields).partial().strict();

export const interviewListQuerySchema = z.object({
  view: z.enum(["upcoming", "past", "all"]).default("upcoming").catch("upcoming"),
  status: z.enum(InterviewStatus).optional().catch(undefined),
  from: z.iso.datetime({ offset: true }).optional().catch(undefined),
  to: z.iso.datetime({ offset: true }).optional().catch(undefined),
});

export type InterviewFormValues = {
  applicationId: string;
  scheduledAt: string;
  durationMinutes?: string;
  type?: string;
  status?: string;
  interviewerName?: string;
  meetingUrl?: string;
  location?: string;
  notes?: string;
};
export type InterviewInput = z.output<typeof interviewInputSchema>;
export type InterviewPatch = z.output<typeof interviewPatchSchema>;
export type InterviewListQuery = z.output<typeof interviewListQuerySchema>;
