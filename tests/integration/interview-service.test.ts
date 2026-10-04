import { beforeEach, describe, expect, it } from "vitest";

import { interviewInputSchema } from "@/features/interviews/schemas";
import { NotFoundError } from "@/server/errors";
import {
  createInterview,
  deleteInterview,
  getInterview,
  listInterviews,
  updateInterview,
} from "@/server/services/interviews";

import { factory, resetDatabase } from "../support/db";

async function userWithApplication() {
  const user = await factory.user();
  const app = await factory.application(user.id, (await factory.company(user.id)).id);
  return { user, app };
}

const input = (applicationId: string, overrides: Record<string, unknown> = {}) =>
  interviewInputSchema.parse({ applicationId, scheduledAt: "2030-03-05T10:00", ...overrides });

describe("interview service", () => {
  beforeEach(resetDatabase);

  it("stores the user's wall-clock time as UTC using their time zone", async () => {
    const { user, app } = await userWithApplication();
    const interview = await createInterview(user.id, "Asia/Kolkata", input(app.id));
    expect(interview.scheduledAt.toISOString()).toBe("2030-03-05T04:30:00.000Z");
  });

  it("accepts an ISO timestamp with offset unchanged (API clients)", async () => {
    const { user, app } = await userWithApplication();
    const interview = await createInterview(
      user.id,
      "Asia/Kolkata",
      input(app.id, { scheduledAt: "2030-03-05T09:00:00Z" }),
    );
    expect(interview.scheduledAt.toISOString()).toBe("2030-03-05T09:00:00.000Z");
  });

  it("refuses to schedule an interview on someone else's application", async () => {
    const alice = await factory.user();
    const { app: bobsApp } = await userWithApplication();
    await expect(createInterview(alice.id, "UTC", input(bobsApp.id))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("splits upcoming and past, scoped to the user", async () => {
    const { user, app } = await userWithApplication();
    const other = await userWithApplication();
    const now = new Date("2030-01-01T00:00:00Z");
    await createInterview(user.id, "UTC", input(app.id, { scheduledAt: "2030-02-01T10:00" }));
    await createInterview(user.id, "UTC", input(app.id, { scheduledAt: "2029-12-01T10:00" }));
    await createInterview(other.user.id, "UTC", input(other.app.id));

    expect(await listInterviews(user.id, { view: "upcoming" }, now)).toHaveLength(1);
    expect(await listInterviews(user.id, { view: "past" }, now)).toHaveLength(1);
    expect(await listInterviews(user.id, { view: "all" }, now)).toHaveLength(2);
  });

  it("updates and deletes only the owner's interviews", async () => {
    const { user, app } = await userWithApplication();
    const intruder = await factory.user();
    const interview = await createInterview(user.id, "UTC", input(app.id));

    await expect(
      updateInterview(intruder.id, "UTC", interview.id, { status: "CANCELLED" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteInterview(intruder.id, interview.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await getInterview(intruder.id, interview.id)).toBeNull();

    const updated = await updateInterview(user.id, "UTC", interview.id, {
      status: "COMPLETED",
      scheduledAt: "2030-03-06T15:30",
    });
    expect(updated.status).toBe("COMPLETED");
    expect(updated.scheduledAt.toISOString()).toBe("2030-03-06T15:30:00.000Z");

    await deleteInterview(user.id, interview.id);
    expect(await getInterview(user.id, interview.id)).toBeNull();
  });

  it("can't move an interview onto another user's application", async () => {
    const { user, app } = await userWithApplication();
    const { app: othersApp } = await userWithApplication();
    const interview = await createInterview(user.id, "UTC", input(app.id));
    await expect(
      updateInterview(user.id, "UTC", interview.id, { applicationId: othersApp.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
