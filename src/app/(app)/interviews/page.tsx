import { CalendarClock, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InterviewList } from "@/features/interviews/components/interview-list";
import { interviewListQuerySchema } from "@/features/interviews/schemas";
import { cn } from "@/lib/utils";
import { listInterviews } from "@/server/services/interviews";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Interviews" };

const views = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
] as const;

export default async function InterviewsPage({ searchParams }: PageProps<"/interviews">) {
  const user = await requireUser();
  const { view } = interviewListQuerySchema.parse(await searchParams);
  const interviews = await listInterviews(user.id, { view });

  const scheduleButton = (
    <Button asChild>
      <Link href="/interviews/new">
        <Plus /> Schedule interview
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Interviews"
        description="Upcoming and past interviews."
        actions={scheduleButton}
      />
      <nav
        aria-label="Interview views"
        className="bg-muted/40 mb-4 inline-flex rounded-lg border p-1"
      >
        {views.map((option) => (
          <Link
            key={option.value}
            href={`/interviews?view=${option.value}`}
            aria-current={view === option.value ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === option.value
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      {interviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={view === "past" ? "No past interviews" : "No upcoming interviews"}
          description={
            view === "past"
              ? "Interviews you've had will appear here."
              : "When a company invites you, schedule it here and it will show on your dashboard."
          }
          action={view === "past" ? undefined : scheduleButton}
        />
      ) : (
        <InterviewList interviews={interviews} timeZone={user.timezone ?? "UTC"} />
      )}
    </>
  );
}
