import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationForm } from "@/features/applications/components/application-form";
import { toDateInputValue } from "@/lib/format";
import { getApplication, searchCompanies } from "@/server/services/applications";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Edit application" };

export default async function EditApplicationPage({
  params,
}: PageProps<"/applications/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const [application, companies] = await Promise.all([
    getApplication(user.id, id),
    searchCompanies(user.id),
  ]);
  if (!application) notFound();

  return (
    <>
      <PageHeader
        title="Edit application"
        description={`${application.jobTitle} at ${application.company.name}`}
      />
      <Card>
        <CardContent>
          <ApplicationForm
            applicationId={application.id}
            companyNames={companies.map((c) => c.name)}
            defaultValues={{
              companyName: application.company.name,
              jobTitle: application.jobTitle,
              jobUrl: application.jobUrl ?? "",
              location: application.location ?? "",
              workMode: application.workMode ?? "",
              salaryMin: application.salaryMin?.toString() ?? "",
              salaryMax: application.salaryMax?.toString() ?? "",
              salaryCurrency: application.salaryCurrency ?? "",
              status: application.status,
              appliedAt: toDateInputValue(application.appliedAt),
              followUpAt: toDateInputValue(application.followUpAt),
              jobDescription: application.jobDescription ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
