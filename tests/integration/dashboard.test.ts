import { beforeEach, describe, expect, it } from "vitest";

import { applicationInputSchema } from "@/features/applications/schemas";
import { createApplication } from "@/server/services/applications";
import { getDashboardData } from "@/server/services/dashboard";

import { db, factory, resetDatabase } from "../support/db";

const DAY = 86_400_000;

describe("getDashboardData", () => {
  beforeEach(resetDatabase);

  it("returns zeros and empty lists for a new user", async () => {
    const user = await factory.user();
    const data = await getDashboardData(user.id);
    expect(data.totals).toEqual({
      applications: 0,
      appliedThisMonth: 0,
      interviews: 0,
      upcomingInterviews: 0,
      offers: 0,
      rejections: 0,
    });
    expect(data.statusBreakdown).toHaveLength(7);
    expect(data.recentApplications).toEqual([]);
  });

  it("counts only the user's own data, by status, month and upcoming interviews", async () => {
    const now = new Date("2026-05-20T12:00:00Z");
    const alice = await factory.user();
    const bob = await factory.user();
    const make = (userId: string, status: string, appliedAt: string) =>
      createApplication(
        userId,
        applicationInputSchema.parse({ companyName: "Acme", jobTitle: "Dev", status, appliedAt }),
      );

    const a1 = await make(alice.id, "INTERVIEW", "2026-05-03");
    await make(alice.id, "OFFER", "2026-04-10");
    await make(alice.id, "ACCEPTED", "2026-03-01");
    await make(alice.id, "REJECTED", "2026-05-15");
    await make(bob.id, "REJECTED", "2026-05-15"); // must not be counted for Alice

    await db.interview.createMany({
      data: [
        { userId: alice.id, applicationId: a1.id, scheduledAt: new Date(now.getTime() + DAY) },
        {
          userId: alice.id,
          applicationId: a1.id,
          scheduledAt: new Date(now.getTime() - DAY),
          status: "COMPLETED",
        },
      ],
    });

    const data = await getDashboardData(alice.id, now);

    expect(data.totals).toEqual({
      applications: 4,
      appliedThisMonth: 2,
      interviews: 2,
      upcomingInterviews: 1,
      offers: 2,
      rejections: 1,
    });
    expect(data.statusBreakdown.find((s) => s.status === "REJECTED")?.count).toBe(1);
    expect(data.upcomingInterviews).toHaveLength(1);
    expect(data.recentApplications).toHaveLength(4);
  });
});
