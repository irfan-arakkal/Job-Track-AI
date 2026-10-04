import { InterviewStatus, InterviewType } from "@/generated/prisma/enums";

/** Display data for interview enums. Safe to use in the browser. */
export const interviewTypes = [
  { value: InterviewType.PHONE_SCREEN, label: "Phone screen" },
  { value: InterviewType.TECHNICAL, label: "Technical" },
  { value: InterviewType.BEHAVIORAL, label: "Behavioral" },
  { value: InterviewType.SYSTEM_DESIGN, label: "System design" },
  { value: InterviewType.ONSITE, label: "On-site" },
  { value: InterviewType.HR, label: "HR" },
  { value: InterviewType.FINAL, label: "Final round" },
  { value: InterviewType.OTHER, label: "Other" },
] as const;

export const interviewStatuses = [
  { value: InterviewStatus.SCHEDULED, label: "Scheduled" },
  { value: InterviewStatus.COMPLETED, label: "Completed" },
  { value: InterviewStatus.CANCELLED, label: "Cancelled" },
  { value: InterviewStatus.RESCHEDULED, label: "Rescheduled" },
  { value: InterviewStatus.NO_SHOW, label: "No-show" },
] as const;

export const interviewTypeLabel = Object.fromEntries(
  interviewTypes.map((t) => [t.value, t.label]),
) as Record<InterviewType, string>;

export const interviewStatusLabel = Object.fromEntries(
  interviewStatuses.map((s) => [s.value, s.label]),
) as Record<InterviewStatus, string>;

export { InterviewStatus, InterviewType };
