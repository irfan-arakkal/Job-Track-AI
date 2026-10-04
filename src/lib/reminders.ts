import { utcToZonedLocal } from "@/lib/timezone";

/*
 * Reminder rules as a PURE function: data in, reminders out. No database, no clock — `now` is
 * passed in — which makes every rule easy to unit-test with fixed dates and time zones.
 */

export type ReminderType = "NO_RESPONSE" | "FOLLOW_UP" | "INTERVIEW_TODAY" | "INTERVIEW_TOMORROW";

export type ReminderCandidate = {
  type: ReminderType;
  /** Stable identity: same situation → same key, so generating twice never duplicates. */
  dedupeKey: string;
  title: string;
  dueAt: Date;
  applicationId: string | null;
  interviewId: string | null;
};

type AppInput = {
  id: string;
  jobTitle: string;
  companyName: string;
  status: string;
  appliedAt: Date | null;
  followUpAt: Date | null;
};
type InterviewInput = {
  id: string;
  applicationId: string;
  scheduledAt: Date;
  status: string;
  typeLabel: string;
  companyName: string;
};

const DAY = 86_400_000;
const ACTIVE = new Set(["APPLIED", "SCREENING", "INTERVIEW", "OFFER"]);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const localDate = (date: Date, timeZone: string) => utcToZonedLocal(date, timeZone).slice(0, 10);

export function computeReminders({
  applications,
  interviews,
  now,
  timeZone,
  noResponseDays = 7,
}: {
  applications: AppInput[];
  interviews: InterviewInput[];
  now: Date;
  timeZone: string;
  noResponseDays?: number;
}): ReminderCandidate[] {
  const reminders: ReminderCandidate[] = [];
  const today = localDate(now, timeZone);
  const tomorrow = localDate(new Date(now.getTime() + DAY), timeZone);

  for (const app of applications) {
    // 1. Applied N+ days ago and still "Applied" → no response yet.
    if (
      app.status === "APPLIED" &&
      app.appliedAt &&
      now.getTime() - app.appliedAt.getTime() >= noResponseDays * DAY
    ) {
      const days = Math.floor((now.getTime() - app.appliedAt.getTime()) / DAY);
      reminders.push({
        type: "NO_RESPONSE",
        dedupeKey: `no_response:${app.id}:${dateKey(app.appliedAt)}`,
        title: `No response from ${app.companyName} for ${days} days — consider following up (${app.jobTitle})`,
        dueAt: new Date(app.appliedAt.getTime() + noResponseDays * DAY),
        applicationId: app.id,
        interviewId: null,
      });
    }
    // 2. A follow-up date the user set is today or past (date-only, compared in their zone).
    if (app.followUpAt && ACTIVE.has(app.status) && dateKey(app.followUpAt) <= today) {
      reminders.push({
        type: "FOLLOW_UP",
        dedupeKey: `follow_up:${app.id}:${dateKey(app.followUpAt)}`,
        title: `Follow up with ${app.companyName} about ${app.jobTitle}`,
        dueAt: app.followUpAt,
        applicationId: app.id,
        interviewId: null,
      });
    }
  }

  for (const interview of interviews) {
    if (interview.status !== "SCHEDULED" || interview.scheduledAt.getTime() < now.getTime())
      continue;
    const day = localDate(interview.scheduledAt, timeZone);
    const time = utcToZonedLocal(interview.scheduledAt, timeZone).slice(11, 16);
    // 3/4. Interview today or tomorrow — "today" and "tomorrow" in the USER's time zone.
    if (day === today || day === tomorrow) {
      const isToday = day === today;
      reminders.push({
        type: isToday ? "INTERVIEW_TODAY" : "INTERVIEW_TOMORROW",
        dedupeKey: `${isToday ? "interview_today" : "interview_tomorrow"}:${interview.id}:${interview.scheduledAt.toISOString()}`,
        title: `${interview.typeLabel} interview with ${interview.companyName} ${isToday ? "today" : "tomorrow"} at ${time}`,
        dueAt: interview.scheduledAt,
        applicationId: interview.applicationId,
        interviewId: interview.id,
      });
    }
  }

  return reminders.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
