"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit({ password }: ResetPasswordInput) {
    setFormError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <Alert>
          <CheckCircle2 />
          <AlertDescription>
            Your password has been changed and you&apos;ve been signed out on all devices.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Log in with your new password</Link>
        </Button>
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

      <FormField
        id="password"
        label="New password"
        error={errors.password?.message}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby="password-message"
          {...register("password")}
        />
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? "confirmPassword-message" : undefined}
          {...register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {isSubmitting ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
