"use client";

import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { analyzeResumeAction } from "@/features/analysis/actions";

type Props = {
  resumes: { id: string; label: string; isPrimary: boolean }[];
  applications: { id: string; label: string; hasDescription: boolean }[];
  defaultApplicationId?: string;
};

export function AnalysisForm({ resumes, applications, defaultApplicationId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [applicationId, setApplicationId] = useState(defaultApplicationId ?? "");
  const selectedApp = applications.find((a) => a.id === applicationId);

  // A plain submit handler (not <form action>): React resets forms after an action, which would
  // wipe a long pasted job description whenever validation fails.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await analyzeResumeAction(Object.fromEntries(formData));
      if (!result.ok) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push(`/resumes/analyses/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="resumeId" label="Resume">
          <NativeSelect
            id="resumeId"
            name="resumeId"
            defaultValue={resumes.find((r) => r.isPrimary)?.id}
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.label}
                {resume.isPrimary ? " (primary)" : ""}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="applicationId"
          label="Application (optional)"
          hint={
            selectedApp && !selectedApp.hasDescription
              ? "This application has no saved job description — paste one below."
              : "Uses the application's saved job description unless you paste one."
          }
        >
          <NativeSelect
            id="applicationId"
            name="applicationId"
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
            aria-describedby="applicationId-message"
          >
            <option value="">None — I&apos;ll paste a job description</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <FormField id="jobTitle" label="Job title (optional)">
        <Input
          id="jobTitle"
          name="jobTitle"
          maxLength={200}
          placeholder="Senior Frontend Engineer"
        />
      </FormField>

      <FormField
        id="jobDescription"
        label={selectedApp?.hasDescription ? "Job description (optional)" : "Job description"}
        error={fieldErrors.jobDescription?.[0]}
      >
        <Textarea
          id="jobDescription"
          name="jobDescription"
          rows={10}
          maxLength={20_000}
          placeholder="Paste the full job posting here…"
          aria-invalid={!!fieldErrors.jobDescription}
          aria-describedby={fieldErrors.jobDescription ? "jobDescription-message" : undefined}
        />
      </FormField>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {isPending
            ? "Analysing your resume… this usually takes 20–60 seconds."
            : "Your resume text and the job description are sent to the AI for this analysis."}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {isPending ? "Analysing…" : "Analyse match"}
        </Button>
      </div>
    </form>
  );
}
