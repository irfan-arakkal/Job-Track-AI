import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { isPasswordResetAvailable } from "@/server/email";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  const available = isPasswordResetAvailable();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Forgot your password?</h1>
        </CardTitle>
        <CardDescription>
          {available
            ? "Enter your email and we'll send you a link to choose a new one."
            : "Password reset by email isn't set up on this deployment yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {available ? (
          <ForgotPasswordForm />
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to log in
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
