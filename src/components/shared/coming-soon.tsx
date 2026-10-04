import { Construction } from "lucide-react";

/** Placeholder for sections that later phases will build. */
export function ComingSoon({ phase, description }: { phase: number; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <span className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Construction className="text-muted-foreground size-5" aria-hidden />
      </span>
      <h2 className="font-semibold">Coming in Phase {phase}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
    </div>
  );
}
