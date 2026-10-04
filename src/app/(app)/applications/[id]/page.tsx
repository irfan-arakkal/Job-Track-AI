import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteApplicationButton } from "@/features/applications/components/delete-application-button";
import { NotesSection } from "@/features/applications/components/notes-section";
import { StatusSelect } from "@/features/applications/components/status-select";
import { StatusTimeline } from "@/features/applications/components/status-timeline";
import { workModeLabel } from "@/lib/applications";
import { formatDate, formatDateTime, formatSalary } from "@/lib/format";
import { getApplication } from "@/server/services/applications";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationDetailPage({ params }: PageProps<"/applications/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const application = await getApplication(user.id, id);
  // Missing and "belongs to someone else" look identical: a 404.
  if (!application) notFound();

  const details = [
    { label: "Company", value: application.company.name },
    { label: "Location", value: application.location ?? "—" },
    { label: "Work mode", value: application.workMode ? workModeLabel[application.workMode] : "—" },
    {
      label: "Salary",
      value: formatSalary(application.salaryMin, application.salaryMax, application.salaryCurrency),
    },
    { label: "Applied", value: formatDate(application.appliedAt) },
    { label: "Follow up", value: formatDate(application.followUpAt) },
    { label: "Created", value: formatDate(application.createdAt) },
    { label: "Last updated", value: formatDate(application.updatedAt) },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/applications">
          <ArrowLeft /> All applications
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{application.jobTitle}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-muted-foreground">{application.company.name}</p>
          {application.jobUrl ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              View job posting <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusSelect applicationId={application.id} status={application.status} />
          <Button asChild variant="outline">
            <Link href={`/applications/${application.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <DeleteApplicationButton
            applicationId={application.id}
            label={`${application.jobTitle} at ${application.company.name}`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Details</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {details.map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <dt className="text-muted-foreground text-sm">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Job description</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.jobDescription ? (
                // Rendered as plain text: React escapes it, so pasted HTML/scripts can't run (XSS).
                <p className="max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
                  {application.jobDescription}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No job description saved. Add one via Edit to use AI resume analysis later.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Notes</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesSection applicationId={application.id} notes={application.notes} />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Interviews</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.interviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">No interviews scheduled.</p>
              ) : (
                <ul className="grid gap-3">
                  {application.interviews.map((interview) => (
                    <li key={interview.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">
                        {interview.type.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDateTime(interview.scheduledAt, user.timezone ?? "UTC")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>History</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline changes={application.statusChanges} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
