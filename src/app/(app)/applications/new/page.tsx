import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationForm } from "@/features/applications/components/application-form";
import { toDateInputValue } from "@/lib/format";
import { searchCompanies } from "@/server/services/applications";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage() {
  const user = await requireUser();
  const companies = await searchCompanies(user.id);

  return (
    <>
      <PageHeader
        title="New application"
        description="Add a job you've applied to or want to apply to."
      />
      <Card>
        <CardContent>
          <ApplicationForm
            companyNames={companies.map((c) => c.name)}
            defaultValues={{
              companyName: "",
              jobTitle: "",
              status: "APPLIED",
              appliedAt: toDateInputValue(new Date()),
              salaryCurrency: "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
