import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/env";
import {
  ChangePasswordForm,
  DeleteAccount,
  ProfileForm,
} from "@/features/settings/components/account-forms";
import { ApiTokens } from "@/features/settings/components/api-tokens";
import { TimeZoneForm } from "@/features/settings/components/timezone-form";
import { listApiTokens } from "@/server/services/api-tokens";
import { listTimeZones } from "@/lib/timezone";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export default async function SettingsPage() {
  // Each page asks for the user itself, so data access never depends on the layout having run.
  const user = await requireUser();
  const tokens = await listApiTokens(user.id);

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
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Preferences</h2>
            </CardTitle>
            <CardDescription>How dates and times are shown to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeZoneForm
              current={user.timezone ?? "UTC"}
              zones={listTimeZones(user.timezone ?? "UTC")}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>API tokens (MCP)</h2>
            </CardTitle>
            <CardDescription>Connect AI tools to your JobTrack data.</CardDescription>
          </CardHeader>
          <CardContent>
            <ApiTokens tokens={tokens} mcpUrl={`${env.BETTER_AUTH_URL}/api/mcp`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Edit profile</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Password</h2>
            </CardTitle>
            <CardDescription>Changing it signs out your other devices.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>
              <h2>Delete account</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteAccount />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
