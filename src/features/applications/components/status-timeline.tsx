import { statusLabel } from "@/lib/applications";
import type { ApplicationDetail } from "@/server/services/applications";

/** The application's journey through the pipeline, oldest first. */
export function StatusTimeline({ changes }: { changes: ApplicationDetail["statusChanges"] }) {
  if (changes.length === 0) {
    return <p className="text-muted-foreground text-sm">No history yet.</p>;
  }
  return (
    <ol className="relative grid gap-4 border-l pl-5">
      {changes.map((change) => (
        <li key={change.id} className="relative">
          <span
            aria-hidden
            className="border-background bg-primary absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2"
          />
          <p className="text-sm font-medium">
            {change.fromStatus
              ? `${statusLabel[change.fromStatus]} → ${statusLabel[change.toStatus]}`
              : `Added as ${statusLabel[change.toStatus]}`}
          </p>
          <p className="text-muted-foreground text-xs">
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(change.changedAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
