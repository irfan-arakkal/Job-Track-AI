import type { ApplicationStatus } from "@/lib/applications";
import { statusLabel, statusTone, type StatusTone } from "@/lib/applications";
import { cn } from "@/lib/utils";

const toneClasses: Record<StatusTone, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
};

/** Coloured pill for an application status. The text label carries the meaning; colour is a
 * secondary cue, so it stays accessible for colour-blind users. */
export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[statusTone[status]],
        className,
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
