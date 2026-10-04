import { beforeEach, describe, expect, it } from "vitest";

import { applicationInputSchema } from "@/features/applications/schemas";
import { createApplication } from "@/server/services/applications";
import { getAnalytics } from "@/server/services/analytics";

import { db, factory, resetDatabase } from "../support/db";

describe("getAnalytics", () => {
  beforeEach(resetDatabase);

  it("aggregates the user's applications by month, company, location and response time", async () => {
    const now = new Date("2026-05-20T12:00:00Z");
    const alice = await factory.user();
    const bob = await factory.user();
    const make = (userId: string, companyName: string, appliedAt: string, location?: string) =>
      createApplication(
        userId,
        applicationInputSchema.parse({ companyName, jobTitle: "Dev", appliedAt, location }),
      );

    const a1 = await make(alice.id, "Acme", "2026-05-02", "Berlin");
    await make(alice.id, "Acme", "2026-03-10", "Berlin");
    await make(alice.id, "Globex", "2026-03-11");
    await make(alice.id, "Old Co", "2025-01-01"); // outside a 3-month range
    await make(bob.id, "Bob Co", "2026-05-01"); // another user

    // Acme replied 4 days after the May application.
    await db.statusChange.create({
      data: {
        applicationId: a1.id,
        fromStatus: "APPLIED",
        toStatus: "SCREENING",
        changedAt: new Date("2026-05-06T00:00:00Z"),
      },
    });
    await db.application.update({ where: { id: a1.id }, data: { status: "SCREENING" } });

    const data = await getAnalytics(alice.id, "3m", now);

    expect(data.perMonth.map((m) => [m.month, m.count])).toEqual([
      ["2026-03", 2],
      ["2026-04", 0],
      ["2026-05", 1],
    ]);
    expect(data.byCompany).toEqual([
      { name: "Acme", count: 2 },
      { name: "Globex", count: 1 },
    ]);
    expect(data.byLocation).toEqual([
      { name: "Berlin", count: 2 },
      { name: "Not specified", count: 1 },
    ]);
    expect(data.responseTime).toEqual({ averageDays: 4, medianDays: 4, responses: 1 });
    expect(data.totals.sentApplications).toBe(3);
  });
});
