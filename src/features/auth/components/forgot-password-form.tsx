"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit({ email }: ForgotPasswordInput) {
    setFormError(null);
    // The email links to Better Auth, which checks the token and then redirects here with
    // ?token=… (or ?error=INVALID_TOKEN).
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="grid gap-4">
        <Alert>
          <CheckCircle2 />
          {/* Same message whether or not the address has an account, so this page can't be
              used to find out who is registered. */}
          <AlertDescription>
            If an account exists for {sentTo}, we&apos;ve sent a link to reset your password. It
            expires in 1 hour.
          </AlertDescription>
        </Alert>
        <BackToLogin />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {formError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-message" : undefined}
          {...register("email")}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>

      <BackToLogin />
    </form>
  );
}

function BackToLogin() {
  return (
    <p className="text-muted-foreground text-center text-sm">
      Remembered it?{" "}
      <Link href="/login" className="text-primary font-medium hover:underline">
        Back to log in
      </Link>
    </p>
  );
}
