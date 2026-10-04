import { beforeEach, describe, expect, it } from "vitest";

import { applicationInputSchema } from "@/features/applications/schemas";
import { NotFoundError } from "@/server/errors";
import { changeApplicationStatus, createApplication } from "@/server/services/applications";
import {
  countPendingReminders,
  listReminders,
  setReminderStatus,
  syncAllReminders,
  syncRemindersForUser,
} from "@/server/services/reminders";

import { db, factory, resetDatabase } from "../support/db";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe("reminder sync", () => {
  beforeEach(resetDatabase);

  async function userWithSilentApplication() {
    const user = await factory.user();
    const app = await createApplication(
      user.id,
      applicationInputSchema.parse({
        companyName: "Acme",
        jobTitle: "Dev",
        appliedAt: daysAgo(10),
      }),
    );
    return { user, app };
  }

  it("is idempotent: running twice creates each reminder once", async () => {
    const { user } = await userWithSilentApplication();
    expect(await syncRemindersForUser(user.id)).toEqual({ created: 1, resolved: 0 });
    expect(await syncRemindersForUser(user.id)).toEqual({ created: 0, resolved: 0 });
    expect(await countPendingReminders(user.id)).toBe(1);
  });

  it("resolves a reminder automatically when the situation changes", async () => {
    const { user, app } = await userWithSilentApplication();
    await syncRemindersForUser(user.id);
    await changeApplicationStatus(user.id, app.id, "SCREENING"); // the company replied

    expect(await syncRemindersForUser(user.id)).toEqual({ created: 0, resolved: 1 });
    expect(await listReminders(user.id)).toEqual([]);
    expect(await listReminders(user.id, "DONE")).toHaveLength(1);
  });

  it("keeps dismissed reminders dismissed", async () => {
    const { user } = await userWithSilentApplication();
    await syncRemindersForUser(user.id);
    const [reminder] = await listReminders(user.id);
    await setReminderStatus(user.id, reminder.id, "DISMISSED");
    await syncRemindersForUser(user.id);
    expect(await countPendingReminders(user.id)).toBe(0);
  });

  it("creates interview reminders in the user's time zone", async () => {
    const user = await factory.user();
    const app = await factory.application(user.id, (await factory.company(user.id)).id);
    await db.interview.create({
      data: {
        userId: user.id,
        applicationId: app.id,
        scheduledAt: new Date(Date.now() + 2 * 3_600_000),
      },
    });
    await syncRemindersForUser(user.id);
    const types = (await listReminders(user.id)).map((r) => r.type);
    expect(types.some((t) => t === "INTERVIEW_TODAY" || t === "INTERVIEW_TOMORROW")).toBe(true);
  });

  it("never lets one user change another user's reminder", async () => {
    const { user } = await userWithSilentApplication();
    const intruder = await factory.user();
    await syncRemindersForUser(user.id);
    const [reminder] = await listReminders(user.id);
    await expect(setReminderStatus(intruder.id, reminder.id, "DONE")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await listReminders(intruder.id)).toEqual([]);
  });

  it("syncs every user in the scheduled job", async () => {
    await userWithSilentApplication();
    await userWithSilentApplication();
    await factory.user(); // nothing to remind
    expect(await syncAllReminders()).toEqual({ users: 3, created: 2, failed: 0 });
  });
});
