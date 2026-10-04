import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** The input. Give it `id`, `aria-invalid`, and `aria-describedby={`${id}-message`}` whenever an
   * error or hint is shown. */
  children: ReactNode;
};

/**
 * Label + input + hint/error, wired up for screen readers: the error is linked to the input via
 * aria-describedby, so assistive tech reads it when the field is focused.
 */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
