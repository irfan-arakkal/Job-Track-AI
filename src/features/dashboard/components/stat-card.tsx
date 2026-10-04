import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
};

/** A KPI tile: the number is the headline, so no chart is needed. */
export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <Icon className="text-muted-foreground size-4" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
