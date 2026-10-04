"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createApplicationAction, updateApplicationAction } from "@/features/applications/actions";
import {
  applicationInputSchema,
  type ApplicationFormValues,
  type ApplicationInput,
} from "@/features/applications/schemas";
import { applicationStatuses, currencies, workModes } from "@/lib/applications";

type ApplicationFormProps = {
  /** Present when editing; absent when creating. */
  applicationId?: string;
  defaultValues: ApplicationFormValues;
  /** The user's existing companies, offered as suggestions. */
  companyNames: string[];
};

export function ApplicationForm({
  applicationId,
  defaultValues,
  companyNames,
}: ApplicationFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, ApplicationInput>({
    // The schema accepts raw strings and outputs typed values (numbers, Dates, enums).
    resolver: zodResolver(applicationInputSchema) as Resolver<
      ApplicationFormValues,
      unknown,
      ApplicationInput
    >,
    defaultValues,
  });

  // The form posts the raw string values; the server parses them again with the same schema.
  async function onSubmit(_parsed: ApplicationInput, event?: React.BaseSyntheticEvent) {
    setFormError(null);
    const raw = Object.fromEntries(new FormData(event?.target as HTMLFormElement));
    const result = applicationId
      ? await updateApplicationAction(applicationId, raw)
      : await createApplicationAction(raw);

    if (!result.ok) {
      setFormError(result.message);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ApplicationFormValues, { message: messages[0] });
      }
      return;
    }
    toast.success(applicationId ? "Application updated." : "Application added.");
    router.push(`/applications/${result.data.id}`);
    router.refresh();
  }

  const fieldProps = (name: keyof ApplicationFormValues) => ({
    id: name,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-message` : undefined,
    ...register(name),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="text-muted-foreground mb-2 text-sm font-semibold">The role</legend>
        <FormField id="companyName" label="Company *" error={errors.companyName?.message}>
          <Input list="company-suggestions" autoComplete="off" {...fieldProps("companyName")} />
          <datalist id="company-suggestions">
            {companyNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </FormField>
        <FormField id="jobTitle" label="Job title *" error={errors.jobTitle?.message}>
          <Input placeholder="Frontend Engineer" {...fieldProps("jobTitle")} />
        </FormField>
        <FormField id="jobUrl" label="Job posting URL" error={errors.jobUrl?.message}>
          <Input type="url" placeholder="https://…" {...fieldProps("jobUrl")} />
        </FormField>
        <FormField id="location" label="Location" error={errors.location?.message}>
          <Input placeholder="Berlin, DE" {...fieldProps("location")} />
        </FormField>
        <FormField id="workMode" label="Work mode" error={errors.workMode?.message}>
          <NativeSelect {...fieldProps("workMode")}>
            <option value="">Not specified</option>
            {workModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="text-muted-foreground mb-2 text-sm font-semibold">Salary</legend>
        <FormField id="salaryMin" label="Minimum" error={errors.salaryMin?.message}>
          <Input inputMode="numeric" placeholder="60,000" {...fieldProps("salaryMin")} />
        </FormField>
        <FormField id="salaryMax" label="Maximum" error={errors.salaryMax?.message}>
          <Input inputMode="numeric" placeholder="80,000" {...fieldProps("salaryMax")} />
        </FormField>
        <FormField id="salaryCurrency" label="Currency" error={errors.salaryCurrency?.message}>
          <NativeSelect {...fieldProps("salaryCurrency")}>
            <option value="">—</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="text-muted-foreground mb-2 text-sm font-semibold">Progress</legend>
        <FormField id="status" label="Status" error={errors.status?.message}>
          <NativeSelect {...fieldProps("status")}>
            {applicationStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="appliedAt"
          label="Date applied"
          error={errors.appliedAt?.message}
          hint="Defaults to today unless on the wishlist."
        >
          <Input type="date" {...fieldProps("appliedAt")} aria-describedby="appliedAt-message" />
        </FormField>
        <FormField id="followUpAt" label="Follow up on" error={errors.followUpAt?.message}>
          <Input type="date" {...fieldProps("followUpAt")} />
        </FormField>
      </fieldset>

      <FormField
        id="jobDescription"
        label="Job description"
        error={errors.jobDescription?.message}
        hint="Paste it here — the AI analysis can use it later."
      >
        <Textarea
          rows={8}
          {...fieldProps("jobDescription")}
          aria-describedby="jobDescription-message"
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {applicationId ? "Save changes" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
