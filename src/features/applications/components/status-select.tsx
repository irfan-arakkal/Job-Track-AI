"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { changeStatusAction } from "@/features/applications/actions";
import { type ApplicationStatus, applicationStatuses, statusLabel } from "@/lib/applications";

/** Change an application's status in one step. Shows the new value immediately (optimistic)
 * and rolls back if the server rejects it. */
export function StatusSelect({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: ApplicationStatus) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await changeStatusAction(applicationId, { status: next });
      if (!result.ok) {
        setValue(previous);
        toast.error(result.message);
        return;
      }
      toast.success(`Status changed to ${statusLabel[next]}.`);
      router.refresh();
    });
  }

  return (
    <NativeSelect
      aria-label="Application status"
      value={value}
      disabled={isPending}
      onChange={(event) => handleChange(event.target.value as ApplicationStatus)}
      className="w-44"
    >
      {applicationStatuses.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}
