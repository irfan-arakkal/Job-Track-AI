"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { authClient } from "@/lib/auth-client";

/*
 * Account forms. They call Better Auth's endpoints from the browser so its origin check and
 * rate limits apply. The server re-validates everything (name hook, password rules).
 */

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const { error } = await authClient.updateUser({ name: value.trim() });
          if (error) return void toast.error(getAuthErrorMessage(error));
          toast.success("Name updated.");
          router.refresh();
        });
      }}
    >
      <Label htmlFor="profile-name">Name</Label>
      <Input
        id="profile-name"
        value={value}
        maxLength={NAME_MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="submit"
        className="justify-self-start"
        disabled={isPending || !value.trim() || value.trim() === name}
      >
        {isPending ? <Loader2 className="animate-spin" /> : null} Save name
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (next.length < PASSWORD_MIN_LENGTH)
          return setError(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
        startTransition(async () => {
          // revokeOtherSessions: signs out every other device — what you want after a password change.
          const { error: apiError } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
          });
          if (apiError) return setError(getAuthErrorMessage(apiError));
          setCurrent("");
          setNext("");
          toast.success("Password changed. Other devices were signed out.");
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-describedby="new-password-hint"
        />
        <p id="new-password-hint" className="text-muted-foreground text-sm">
          At least {PASSWORD_MIN_LENGTH} characters.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="justify-self-start"
        disabled={isPending || !current || !next}
      >
        {isPending ? <Loader2 className="animate-spin" /> : null} Change password
      </Button>
    </form>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        Permanently deletes your account, applications, interviews, notes, resumes (including the
        files), AI analyses, reminders and API tokens.
      </p>
      <AlertDialog onOpenChange={() => setError(null)}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="justify-self-start">
            <AlertTriangle /> Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. Enter your password to confirm.
          </AlertDialogDescription>
          <form
            id="delete-account-form"
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const { error: apiError } = await authClient.deleteUser({ password });
                if (apiError) return setError(getAuthErrorMessage(apiError));
                router.replace("/");
                router.refresh();
              });
            }}
          >
            <Label htmlFor="delete-password">Password</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="submit"
              form="delete-account-form"
              variant="destructive"
              disabled={isPending || !password}
            >
              {isPending ? <Loader2 className="animate-spin" /> : null} Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
