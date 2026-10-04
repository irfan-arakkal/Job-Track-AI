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
import { createInterviewAction, updateInterviewAction } from "@/features/interviews/actions";
import {
  interviewInputSchema,
  type InterviewFormValues,
  type InterviewInput,
} from "@/features/interviews/schemas";
import { interviewStatuses, interviewTypes } from "@/lib/interviews";

type Props = {
  interviewId?: string;
  defaultValues: InterviewFormValues;
  applications: { id: string; label: string }[];
  timeZone: string;
};

export function InterviewForm({ interviewId, defaultValues, applications, timeZone }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InterviewFormValues, unknown, InterviewInput>({
    resolver: zodResolver(interviewInputSchema) as Resolver<
      InterviewFormValues,
      unknown,
      InterviewInput
    >,
    defaultValues,
  });

  async function onSubmit(_parsed: InterviewInput, event?: React.BaseSyntheticEvent) {
    setFormError(null);
    const raw = Object.fromEntries(new FormData(event?.target as HTMLFormElement));
    const result = interviewId
      ? await updateInterviewAction(interviewId, raw)
      : await createInterviewAction(raw);
    if (!result.ok) {
      setFormError(result.message);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof InterviewFormValues, { message: messages[0] });
      }
      return;
    }
    toast.success(interviewId ? "Interview updated." : "Interview scheduled.");
    router.push("/interviews");
    router.refresh();
  }

  const fieldProps = (name: keyof InterviewFormValues) => ({
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField id="applicationId" label="Application *" error={errors.applicationId?.message}>
            <NativeSelect {...fieldProps("applicationId")}>
              <option value="">Choose an application…</option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
        <FormField
          id="scheduledAt"
          label="Date & time *"
          error={errors.scheduledAt?.message}
          hint={`In your time zone (${timeZone}). Change it in Settings.`}
        >
          <Input
            type="datetime-local"
            {...fieldProps("scheduledAt")}
            aria-describedby="scheduledAt-message"
          />
        </FormField>
        <FormField
          id="durationMinutes"
          label="Duration (minutes)"
          error={errors.durationMinutes?.message}
        >
          <Input
            type="number"
            min={5}
            step={5}
            inputMode="numeric"
            {...fieldProps("durationMinutes")}
          />
        </FormField>
        <FormField id="type" label="Type" error={errors.type?.message}>
          <NativeSelect {...fieldProps("type")}>
            {interviewTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="status" label="Status" error={errors.status?.message}>
          <NativeSelect {...fieldProps("status")}>
            {interviewStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="interviewerName" label="Interviewer" error={errors.interviewerName?.message}>
          <Input placeholder="Name and role" {...fieldProps("interviewerName")} />
        </FormField>
        <FormField id="meetingUrl" label="Meeting link" error={errors.meetingUrl?.message}>
          <Input type="url" placeholder="https://meet…" {...fieldProps("meetingUrl")} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField id="location" label="Location" error={errors.location?.message}>
            <Input placeholder="Office address, if in person" {...fieldProps("location")} />
          </FormField>
        </div>
      </div>

      <FormField id="notes" label="Notes" error={errors.notes?.message}>
        <Textarea
          rows={5}
          placeholder="Topics to prepare, questions to ask…"
          {...fieldProps("notes")}
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {interviewId ? "Save changes" : "Schedule interview"}
        </Button>
      </div>
    </form>
  );
}
