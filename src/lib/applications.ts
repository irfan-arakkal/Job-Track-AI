import { ApplicationStatus, WorkMode } from "@/generated/prisma/enums";

/** Display data for application statuses, in pipeline order. Safe to use in the browser. */
export const applicationStatuses = [
  { value: ApplicationStatus.WISHLIST, label: "Wishlist", tone: "slate" },
  { value: ApplicationStatus.APPLIED, label: "Applied", tone: "blue" },
  { value: ApplicationStatus.SCREENING, label: "Screening", tone: "violet" },
  { value: ApplicationStatus.INTERVIEW, label: "Interview", tone: "amber" },
  { value: ApplicationStatus.OFFER, label: "Offer", tone: "emerald" },
  { value: ApplicationStatus.ACCEPTED, label: "Accepted", tone: "green" },
  { value: ApplicationStatus.REJECTED, label: "Rejected", tone: "red" },
] as const;

export type StatusTone = (typeof applicationStatuses)[number]["tone"];

export const statusLabel = Object.fromEntries(
  applicationStatuses.map((s) => [s.value, s.label]),
) as Record<ApplicationStatus, string>;

export const statusTone = Object.fromEntries(
  applicationStatuses.map((s) => [s.value, s.tone]),
) as Record<ApplicationStatus, StatusTone>;

export const workModes = [
  { value: WorkMode.REMOTE, label: "Remote" },
  { value: WorkMode.HYBRID, label: "Hybrid" },
  { value: WorkMode.ONSITE, label: "On-site" },
] as const;

export const workModeLabel = Object.fromEntries(workModes.map((m) => [m.value, m.label])) as Record<
  WorkMode,
  string
>;

export const currencies = ["USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD", "SGD"] as const;

export const applicationSortOptions = [
  { value: "updated", label: "Recently updated" },
  { value: "applied", label: "Date applied" },
  { value: "company", label: "Company (A–Z)" },
] as const;

export type ApplicationSort = (typeof applicationSortOptions)[number]["value"];

export { ApplicationStatus, WorkMode };
