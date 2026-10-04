import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export default async function SettingsPage() {
  // Each page asks for the user itself, so data access never depends on the layout having run.
  const user = await requireUser();

  const details = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Member since", value: dateFormatter.format(user.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Manage your account." />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Profile</h2>
            </CardTitle>
            <CardDescription>Your account details.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              {details.map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="truncate font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <ComingSoon
          phase={14}
          description="Editing your profile, changing your password and deleting your account."
        />
      </div>
    </>
  );
}
