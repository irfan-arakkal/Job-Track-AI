import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteInterviewButton } from "@/features/interviews/components/delete-interview-button";
import { InterviewForm } from "@/features/interviews/components/interview-form";
import { utcToZonedLocal } from "@/lib/timezone";
import { getInterview, listApplicationOptions } from "@/server/services/interviews";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Edit interview" };

export default async function EditInterviewPage({ params }: PageProps<"/interviews/[id]/edit">) {
  const user = await requireUser();
  const timeZone = user.timezone ?? "UTC";
  const { id } = await params;
  const [interview, applications] = await Promise.all([
    getInterview(user.id, id),
    listApplicationOptions(user.id),
  ]);
  if (!interview) notFound();

  return (
    <>
      <PageHeader
        title="Edit interview"
        description={`${interview.application.company.name} — ${interview.application.jobTitle}`}
        actions={<DeleteInterviewButton interviewId={interview.id} />}
      />
      <Card>
        <CardContent>
          <InterviewForm
            interviewId={interview.id}
            timeZone={timeZone}
            applications={applications.map((a) => ({
              id: a.id,
              label: `${a.company.name} — ${a.jobTitle}`,
            }))}
            defaultValues={{
              applicationId: interview.applicationId,
              scheduledAt: utcToZonedLocal(interview.scheduledAt, timeZone),
              durationMinutes: interview.durationMinutes?.toString() ?? "",
              type: interview.type,
              status: interview.status,
              interviewerName: interview.interviewerName ?? "",
              meetingUrl: interview.meetingUrl ?? "",
              location: interview.location ?? "",
              notes: interview.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
