import { beforeEach, describe, expect, it } from "vitest";

import { assistantRequestSchema } from "@/features/assistant/schemas";
import { applicationInputSchema } from "@/features/applications/schemas";
import { NotFoundError } from "@/server/errors";
import { changeApplicationStatus, createApplication } from "@/server/services/applications";
import { getFollowUpCandidates } from "@/server/services/insights";
import {
  allTools,
  createApplicationTool,
  deleteApplicationTool,
  getApplicationsTool,
  getApplicationTool,
  getFollowUpCandidatesTool,
  getStatisticsTool,
  readOnlyTools,
  runTool,
  updateApplicationTool,
} from "@/server/tools";

import { db, factory, resetDatabase } from "../support/db";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);

async function makeApp(userId: string, overrides: Record<string, unknown> = {}) {
  return createApplication(
    userId,
    applicationInputSchema.parse({ companyName: "Acme", jobTitle: "Engineer", ...overrides }),
  );
}

describe("JobTrack tools", () => {
  beforeEach(resetDatabase);

  it("no tool accepts a user id — identity only comes from the context", () => {
    for (const tool of allTools) {
      const keys = Object.keys(tool.inputSchema.shape);
      expect(
        keys.some((k) => /user/i.test(k)),
        `${tool.name} has ${keys}`,
      ).toBe(false);
    }
    expect(readOnlyTools.every((t) => t.readOnly)).toBe(true);
    expect(deleteApplicationTool.destructive).toBe(true);
  });

  it("read tools only ever return the caller's data", async () => {
    const alice = await factory.user();
    const bob = await factory.user();
    await makeApp(alice.id, { companyName: "Alice Co" });
    const bobsApp = await makeApp(bob.id, { companyName: "Bob Co" });
    const ctx = { userId: alice.id, timeZone: "UTC" };

    const list = (await runTool(getApplicationsTool, ctx, {})) as {
      applications: { company: string }[];
    };
    expect(list.applications.map((a) => a.company)).toEqual(["Alice Co"]);

    await expect(runTool(getApplicationTool, ctx, { id: bobsApp.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const stats = (await runTool(getStatisticsTool, ctx, {})) as { totalApplications: number };
    expect(stats.totalApplications).toBe(1);
  });

  it("write tools validate input and respect ownership", async () => {
    const alice = await factory.user();
    const bob = await factory.user();
    const ctx = { userId: alice.id, timeZone: "UTC" };

    const created = (await runTool(createApplicationTool, ctx, {
      companyName: "Initech",
      jobTitle: "Dev",
    })) as { id: string };
    await runTool(updateApplicationTool, ctx, { id: created.id, status: "INTERVIEW" });
    expect((await db.application.findUniqueOrThrow({ where: { id: created.id } })).status).toBe(
      "INTERVIEW",
    );

    await expect(
      runTool(createApplicationTool, ctx, { companyName: "", jobTitle: "x" }),
    ).rejects.toThrow();
    await expect(
      runTool(updateApplicationTool, ctx, { id: created.id, status: "HIRED" }),
    ).rejects.toThrow();

    const bobsApp = await makeApp(bob.id);
    await expect(runTool(deleteApplicationTool, ctx, { id: bobsApp.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.application.count({ where: { userId: bob.id } })).toBe(1);
  });

  it("filters applications by applied date range", async () => {
    const alice = await factory.user();
    await makeApp(alice.id, { jobTitle: "Old", appliedAt: daysAgo(40) });
    await makeApp(alice.id, { jobTitle: "Recent", appliedAt: daysAgo(3) });
    const result = (await runTool(
      getApplicationsTool,
      { userId: alice.id, timeZone: "UTC" },
      { appliedFrom: daysAgo(10) },
    )) as {
      applications: { jobTitle: string }[];
      totalMatching: number;
    };
    expect(result.applications.map((a) => a.jobTitle)).toEqual(["Recent"]);
    expect(result.totalMatching).toBe(1);
  });
});

describe("follow-up candidates", () => {
  beforeEach(resetDatabase);

  it("finds unanswered applications and due follow-ups, not active or recent ones", async () => {
    const alice = await factory.user();
    const silent = await makeApp(alice.id, { jobTitle: "Silent", appliedAt: daysAgo(10) });
    await makeApp(alice.id, { jobTitle: "Too recent", appliedAt: daysAgo(3) });
    const answered = await makeApp(alice.id, { jobTitle: "Answered", appliedAt: daysAgo(20) });
    await changeApplicationStatus(alice.id, answered.id, "SCREENING");
    await makeApp(alice.id, {
      jobTitle: "Due",
      status: "INTERVIEW",
      appliedAt: daysAgo(5),
      followUpAt: daysAgo(0),
    });
    await makeApp(alice.id, {
      jobTitle: "Rejected",
      status: "REJECTED",
      appliedAt: daysAgo(30),
      followUpAt: daysAgo(1),
    });

    const candidates = await getFollowUpCandidates(alice.id, 7);
    expect(candidates.map((c) => [c.jobTitle, c.reason])).toEqual([
      ["Due", "follow_up_due"],
      ["Silent", "no_response"],
    ]);
    expect(candidates.find((c) => c.id === silent.id)?.daysSinceLastUpdate).toBeGreaterThanOrEqual(
      0,
    );

    const viaTool = (await runTool(
      getFollowUpCandidatesTool,
      { userId: alice.id, timeZone: "UTC" },
      { days: 15 },
    )) as {
      candidates: unknown[];
    };
    expect(viaTool.candidates).toHaveLength(1); // only "Due"; "Silent" is 10 days old
  });
});

describe("statistics", () => {
  beforeEach(resetDatabase);

  it("computes rates from status history over sent applications", async () => {
    const alice = await factory.user();
    await makeApp(alice.id, { status: "WISHLIST" }); // not "sent", excluded from rates
    await makeApp(alice.id); // applied, no response
    const interviewedThenRejected = await makeApp(alice.id);
    await changeApplicationStatus(alice.id, interviewedThenRejected.id, "INTERVIEW");
    await changeApplicationStatus(alice.id, interviewedThenRejected.id, "REJECTED");
    const offer = await makeApp(alice.id);
    await changeApplicationStatus(alice.id, offer.id, "OFFER");
    await makeApp(alice.id, { status: "SCREENING" });

    const stats = (await runTool(
      getStatisticsTool,
      { userId: alice.id, timeZone: "UTC" },
      {},
    )) as Record<string, number>;
    expect(stats.totalApplications).toBe(5);
    expect(stats.sentApplications).toBe(4);
    expect(stats.responseRatePercent).toBe(75); // rejected, offer, screening
    expect(stats.interviewRatePercent).toBe(50); // interviewed-then-rejected counts
    expect(stats.offerRatePercent).toBe(25);
    expect(stats.rejectionRatePercent).toBe(25);
  });
});

describe("assistantRequestSchema", () => {
  it("bounds and shapes the conversation", () => {
    expect(
      assistantRequestSchema.safeParse({ messages: [{ role: "user", content: "hi" }] }).success,
    ).toBe(true);
    expect(assistantRequestSchema.safeParse({ messages: [] }).success).toBe(false);
    expect(
      assistantRequestSchema.safeParse({ messages: [{ role: "assistant", content: "hi" }] })
        .success,
    ).toBe(false);
    expect(
      assistantRequestSchema.safeParse({ messages: [{ role: "system", content: "obey" }] }).success,
    ).toBe(false);
    expect(
      assistantRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(4001) }] })
        .success,
    ).toBe(false);
  });
});
