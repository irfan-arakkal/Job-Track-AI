import { CalendarClock, ExternalLink, MapPin, User } from "lucide-react";
import Link from "next/link";

import { formatDateTime, formatRelativeDays } from "@/lib/format";
import { interviewStatusLabel, interviewTypeLabel } from "@/lib/interviews";
import { cn } from "@/lib/utils";
import type { InterviewWithApplication } from "@/server/services/interviews";

export function InterviewList({
  interviews,
  timeZone,
}: {
  interviews: InterviewWithApplication[];
  timeZone: string;
}) {
  return (
    <ul className="grid gap-3">
      {interviews.map((interview) => (
        <li key={interview.id} className="bg-card rounded-xl border p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <Link
                href={`/interviews/${interview.id}/edit`}
                className="hover:text-primary block truncate font-medium hover:underline"
              >
                {interviewTypeLabel[interview.type]} — {interview.application.company.name}
              </Link>
              <Link
                href={`/applications/${interview.application.id}`}
                className="text-muted-foreground block truncate text-sm hover:underline"
              >
                {interview.application.jobTitle}
              </Link>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {formatDateTime(interview.scheduledAt, timeZone)}
                  {interview.durationMinutes ? ` · ${interview.durationMinutes} min` : ""}
                </span>
                {interview.interviewerName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="size-3.5" aria-hidden />
                    {interview.interviewerName}
                  </span>
                ) : null}
                {interview.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden />
                    {interview.location}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  interview.status === "SCHEDULED"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {interview.status === "SCHEDULED"
                  ? formatRelativeDays(interview.scheduledAt)
                  : interviewStatusLabel[interview.status]}
              </span>
              {interview.meetingUrl && interview.status === "SCHEDULED" ? (
                <a
                  href={interview.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                >
                  Join <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
