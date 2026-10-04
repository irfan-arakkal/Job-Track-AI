import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewForm } from "@/features/interviews/components/interview-form";
import { utcToZonedLocal } from "@/lib/timezone";
import { listApplicationOptions } from "@/server/services/interviews";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Schedule interview" };

/** Tomorrow at 10:00 in the user's zone, as a datetime-local value. */
function defaultScheduledAt(timeZone: string) {
  const tomorrow = utcToZonedLocal(new Date(Date.now() + 86_400_000), timeZone).slice(0, 10);
  return `${tomorrow}T10:00`;
}

export default async function NewInterviewPage({ searchParams }: PageProps<"/interviews/new">) {
  const user = await requireUser();
  const timeZone = user.timezone ?? "UTC";
  const { applicationId } = await searchParams;
  const applications = await listApplicationOptions(user.id);

  if (applications.length === 0) {
    return (
      <>
        <PageHeader title="Schedule interview" />
        <p className="text-muted-foreground mb-4">
          Add an application first — interviews belong to one.
        </p>
        <Button asChild>
          <Link href="/applications/new">New application</Link>
        </Button>
      </>
    );
  }

  const preselected =
    typeof applicationId === "string" && applications.some((a) => a.id === applicationId)
      ? applicationId
      : "";

  return (
    <>
      <PageHeader title="Schedule interview" />
      <Card>
        <CardContent>
          <InterviewForm
            timeZone={timeZone}
            applications={applications.map((a) => ({
              id: a.id,
              label: `${a.company.name} — ${a.jobTitle}`,
            }))}
            defaultValues={{
              applicationId: preselected,
              scheduledAt: defaultScheduledAt(timeZone),
              durationMinutes: "60",
              type: "TECHNICAL",
              status: "SCHEDULED",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
