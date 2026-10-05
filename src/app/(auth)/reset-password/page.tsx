import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

/**
 * Landing page for the emailed link. Better Auth checks the token first and redirects here with
 * ?token=… when it's valid, or ?error=INVALID_TOKEN when it's unknown or expired.
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 && !error ? token : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Choose a new password</h1>
        </CardTitle>
        {validToken ? (
          <CardDescription>You&apos;ll be signed out on all devices afterwards.</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {validToken ? (
          <ResetPasswordForm token={validToken} />
        ) : (
          <div className="grid gap-4">
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>
                This reset link is invalid or has expired. Links work once and last 1 hour.
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
