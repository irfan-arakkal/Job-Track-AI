import { describe, expect, it } from "vitest";

import { computeReminders } from "@/lib/reminders";

const now = new Date("2026-05-20T10:00:00Z");
const app = (
  overrides: Partial<Parameters<typeof computeReminders>[0]["applications"][number]> = {},
) => ({
  id: "a1",
  jobTitle: "Engineer",
  companyName: "Acme",
  status: "APPLIED",
  appliedAt: new Date("2026-05-10T00:00:00Z"),
  followUpAt: null,
  ...overrides,
});
const interview = (scheduledAt: string, overrides = {}) => ({
  id: "i1",
  applicationId: "a1",
  scheduledAt: new Date(scheduledAt),
  status: "SCHEDULED",
  typeLabel: "Technical",
  companyName: "Acme",
  ...overrides,
});
const run = (
  applications: ReturnType<typeof app>[],
  interviews: ReturnType<typeof interview>[] = [],
  timeZone = "UTC",
) => computeReminders({ applications, interviews, now, timeZone });

describe("computeReminders", () => {
  it("flags applications with no response after 7 days, with a stable key", () => {
    const [reminder] = run([app()]);
    expect(reminder).toMatchObject({
      type: "NO_RESPONSE",
      dedupeKey: "no_response:a1:2026-05-10",
      applicationId: "a1",
    });
    expect(reminder.title).toContain("10 days");
    expect(run([app()])[0].dedupeKey).toBe(reminder.dedupeKey); // same input → same key
  });

  it("ignores recent applications and ones that got a response", () => {
    expect(run([app({ appliedAt: new Date("2026-05-15T00:00:00Z") })])).toEqual([]);
    expect(run([app({ status: "SCREENING" })])).toEqual([]);
    expect(run([app({ status: "WISHLIST", appliedAt: null })])).toEqual([]);
  });

  it("creates follow-up reminders when the date is due, only for active applications", () => {
    const due = app({ status: "INTERVIEW", followUpAt: new Date("2026-05-20T00:00:00Z") });
    expect(run([due]).map((r) => r.type)).toEqual(["FOLLOW_UP"]);
    expect(
      run([app({ status: "INTERVIEW", followUpAt: new Date("2026-05-21T00:00:00Z") })]),
    ).toEqual([]);
    expect(
      run([app({ status: "REJECTED", followUpAt: new Date("2026-05-01T00:00:00Z") })]),
    ).toEqual([]);
  });

  it("creates interview reminders for today and tomorrow in the user's time zone", () => {
    const today = run([], [interview("2026-05-20T15:00:00Z")]);
    expect(today[0]).toMatchObject({ type: "INTERVIEW_TODAY", interviewId: "i1" });
    expect(today[0].title).toBe("Technical interview with Acme today at 15:00");

    const tomorrow = run([], [interview("2026-05-21T09:00:00Z")]);
    expect(tomorrow[0].type).toBe("INTERVIEW_TOMORROW");

    expect(run([], [interview("2026-05-23T09:00:00Z")])).toEqual([]); // later this week
    expect(run([], [interview("2026-05-20T08:00:00Z")])).toEqual([]); // already happened
    expect(run([], [interview("2026-05-20T15:00:00Z", { status: "CANCELLED" })])).toEqual([]);
  });

  it("uses the user's zone to decide what 'tomorrow' means", () => {
    // 2026-05-20 20:00 UTC is 21 May 01:30 in India → "tomorrow" there, "today" in UTC.
    const at = "2026-05-20T20:00:00Z";
    expect(run([], [interview(at)], "UTC")[0].type).toBe("INTERVIEW_TODAY");
    const india = run([], [interview(at)], "Asia/Kolkata")[0];
    expect(india.type).toBe("INTERVIEW_TOMORROW");
    expect(india.title).toContain("at 01:30");
  });

  it("returns reminders sorted by due date", () => {
    const result = run([app()], [interview("2026-05-20T15:00:00Z")]);
    expect(result.map((r) => r.type)).toEqual(["NO_RESPONSE", "INTERVIEW_TODAY"]);
  });
});
