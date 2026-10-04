import "server-only";

import { z } from "zod";

import { applicationInputSchema, applicationPatchSchema } from "@/features/applications/schemas";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { NotFoundError } from "@/server/errors";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
} from "@/server/services/applications";
import { getFollowUpCandidates, getStatistics } from "@/server/services/insights";
import { listInterviews } from "@/server/services/interviews";

/*
 * JobTrack tools — defined ONCE and used by both the in-app AI assistant (Phase 9) and the
 * MCP server (Phase 10).
 *
 * Security rule: a tool never accepts a user id as input. The caller's identity comes from the
 * authenticated context (session or API token), and every handler passes `ctx.userId` to the
 * service layer, which scopes all queries. A model can't ask for someone else's data because
 * there is no parameter to ask with.
 */

export type ToolContext = { userId: string; timeZone: string };

export type JobTrackTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodObject;
  /** True if the tool only reads data. The assistant only gets read-only tools. */
  readOnly: boolean;
  /** True if the tool deletes data (MCP clients should ask the user to confirm). */
  destructive?: boolean;
  run: (ctx: ToolContext, input: never) => Promise<unknown>;
};

function defineTool<S extends z.ZodObject>(tool: {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  readOnly: boolean;
  destructive?: boolean;
  run: (ctx: ToolContext, input: z.output<S>) => Promise<unknown>;
}): JobTrackTool {
  return tool as unknown as JobTrackTool;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const dayStart = (date: string) => new Date(`${date}T00:00:00.000Z`);
const dayEnd = (date: string) => new Date(`${date}T23:59:59.999Z`);
const statusEnum = z.enum(
  Object.values(ApplicationStatus) as [ApplicationStatus, ...ApplicationStatus[]],
);

const summarize = (app: Awaited<ReturnType<typeof listApplications>>["items"][number]) => ({
  id: app.id,
  jobTitle: app.jobTitle,
  company: app.company.name,
  status: app.status,
  location: app.location,
  appliedAt: app.appliedAt?.toISOString().slice(0, 10) ?? null,
  followUpAt: app.followUpAt?.toISOString().slice(0, 10) ?? null,
  lastUpdated: app.updatedAt.toISOString().slice(0, 10),
});

export const getApplicationsTool = defineTool({
  name: "get_applications",
  title: "List applications",
  description:
    "List the user's job applications, most recently updated first. Optionally filter by status or search text (matches job title, company and location). Returns id, title, company, status, location and dates.",
  readOnly: true,
  inputSchema: z.object({
    status: statusEnum.optional().describe("Only applications with this status."),
    query: z.string().max(200).optional().describe("Search text for title, company or location."),
    appliedFrom: isoDate.optional().describe("Only applications applied on or after this date."),
    appliedTo: isoDate.optional().describe("Only applications applied on or before this date."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum results (default 50)."),
  }),
  run: async (ctx, input) => {
    const { items, total } = await listApplications(ctx.userId, {
      status: input.status,
      q: input.query,
      pageSize: input.limit ?? 50,
    });
    const filtered = items.filter((app) => {
      if (!input.appliedFrom && !input.appliedTo) return true;
      if (!app.appliedAt) return false;
      if (input.appliedFrom && app.appliedAt < dayStart(input.appliedFrom)) return false;
      if (input.appliedTo && app.appliedAt > dayEnd(input.appliedTo)) return false;
      return true;
    });
    return {
      totalMatching: input.appliedFrom || input.appliedTo ? filtered.length : total,
      applications: filtered.map(summarize),
    };
  },
});

export const getApplicationTool = defineTool({
  name: "get_application",
  title: "Get one application",
  description:
    "Get full details of one application by id: company, salary, dates, job description excerpt, notes, interviews and status history.",
  readOnly: true,
  inputSchema: z.object({
    id: z.string().min(1).describe("Application id from get_applications."),
  }),
  run: async (ctx, { id }) => {
    const app = await getApplication(ctx.userId, id);
    if (!app) throw new NotFoundError("Application");
    return {
      ...summarize(app),
      jobUrl: app.jobUrl,
      workMode: app.workMode,
      salary:
        app.salaryMin || app.salaryMax
          ? { min: app.salaryMin, max: app.salaryMax, currency: app.salaryCurrency }
          : null,
      jobDescriptionExcerpt: app.jobDescription?.slice(0, 1500) ?? null,
      notes: app.notes.map((n) => ({
        createdAt: n.createdAt.toISOString().slice(0, 10),
        content: n.content,
      })),
      interviews: app.interviews.map((i) => ({
        type: i.type,
        status: i.status,
        when: formatDateTime(i.scheduledAt, ctx.timeZone),
        interviewer: i.interviewerName,
      })),
      statusHistory: app.statusChanges.map((c) => ({
        from: c.fromStatus,
        to: c.toStatus,
        date: c.changedAt.toISOString().slice(0, 10),
      })),
    };
  },
});

export const getInterviewsTool = defineTool({
  name: "get_interviews",
  title: "List interviews",
  description:
    "List the user's interviews. Times are given in the user's time zone. Use from/to (YYYY-MM-DD, inclusive) for date ranges such as 'next week'.",
  readOnly: true,
  inputSchema: z.object({
    view: z
      .enum(["upcoming", "past", "all"])
      .optional()
      .describe("Default 'upcoming'. Ignored if from/to are given."),
    from: isoDate.optional(),
    to: isoDate.optional(),
  }),
  run: async (ctx, input) => {
    const ranged = Boolean(input.from || input.to);
    const interviews = await listInterviews(ctx.userId, {
      view: ranged ? "all" : (input.view ?? "upcoming"),
      from: input.from ? dayStart(input.from).toISOString() : undefined,
      to: input.to ? dayEnd(input.to).toISOString() : undefined,
    });
    return {
      timeZone: ctx.timeZone,
      interviews: interviews.map((i) => ({
        id: i.id,
        applicationId: i.application.id,
        company: i.application.company.name,
        jobTitle: i.application.jobTitle,
        type: i.type,
        status: i.status,
        when: formatDateTime(i.scheduledAt, ctx.timeZone),
        startsAtUtc: i.scheduledAt.toISOString(),
        durationMinutes: i.durationMinutes,
        interviewer: i.interviewerName,
      })),
    };
  },
});

export const getStatisticsTool = defineTool({
  name: "get_statistics",
  title: "Job search statistics",
  description:
    "Counts and rates for the user's job search: totals, applications by status, interviews, and response/interview/offer/rejection rates (percent of sent applications). Optionally limit to applications applied within a date range.",
  readOnly: true,
  inputSchema: z.object({ from: isoDate.optional(), to: isoDate.optional() }),
  run: async (ctx, input) =>
    getStatistics(ctx.userId, {
      from: input.from ? dayStart(input.from) : undefined,
      to: input.to ? dayEnd(input.to) : undefined,
    }),
});

export const getFollowUpCandidatesTool = defineTool({
  name: "get_follow_up_candidates",
  title: "Applications to follow up on",
  description:
    "Applications the user should follow up on: still 'Applied' with no response after N days, or with a follow-up date that is due.",
  readOnly: true,
  inputSchema: z.object({
    days: z
      .number()
      .int()
      .min(1)
      .max(90)
      .optional()
      .describe("Days without a response (default 7)."),
  }),
  run: async (ctx, input) => ({
    candidates: await getFollowUpCandidates(ctx.userId, input.days ?? 7),
  }),
});

export const createApplicationTool = defineTool({
  name: "create_application",
  title: "Create an application",
  description:
    "Add a new job application. The company is reused if the user already has one with that name.",
  readOnly: false,
  inputSchema: z.object({
    companyName: z.string().min(1).max(200),
    jobTitle: z.string().min(1).max(200),
    status: statusEnum.optional().describe("Default APPLIED."),
    jobUrl: z.string().max(2048).optional(),
    location: z.string().max(200).optional(),
    appliedAt: isoDate.optional(),
    jobDescription: z.string().max(20_000).optional(),
  }),
  // Reuse the exact validation the UI and REST API use.
  run: async (ctx, input) =>
    summarize(await createApplication(ctx.userId, applicationInputSchema.parse(input))),
});

export const updateApplicationTool = defineTool({
  name: "update_application",
  title: "Update an application",
  description:
    "Change fields of an existing application, e.g. its status (status changes are recorded in the history). Only the fields you pass are changed.",
  readOnly: false,
  inputSchema: z.object({
    id: z.string().min(1),
    status: statusEnum.optional(),
    jobTitle: z.string().min(1).max(200).optional(),
    location: z.string().max(200).optional(),
    jobUrl: z.string().max(2048).optional(),
    followUpAt: isoDate.optional(),
  }),
  run: async (ctx, { id, ...changes }) =>
    summarize(await updateApplication(ctx.userId, id, applicationPatchSchema.parse(changes))),
});

export const deleteApplicationTool = defineTool({
  name: "delete_application",
  title: "Delete an application",
  description:
    "Permanently delete an application with its interviews, notes and history. Only use when the user explicitly asks to delete it.",
  readOnly: false,
  destructive: true,
  inputSchema: z.object({ id: z.string().min(1) }),
  run: async (ctx, { id }) => {
    await deleteApplication(ctx.userId, id);
    return { deleted: true, id };
  },
});

export const readOnlyTools: JobTrackTool[] = [
  getApplicationsTool,
  getApplicationTool,
  getInterviewsTool,
  getStatisticsTool,
  getFollowUpCandidatesTool,
];

export const allTools: JobTrackTool[] = [
  ...readOnlyTools,
  createApplicationTool,
  updateApplicationTool,
  deleteApplicationTool,
];

/** Runs a tool with validated input. Throws on invalid input or errors from the service. */
export async function runTool(tool: JobTrackTool, ctx: ToolContext, rawInput: unknown) {
  const input = tool.inputSchema.parse(rawInput ?? {});
  return tool.run(ctx, input as never);
}
