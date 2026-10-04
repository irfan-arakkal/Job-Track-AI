import { cn } from "@/lib/utils";

/** Describes a score in words — the number is never communicated by colour alone. */
export function scoreLabel(score: number) {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Strong match";
  if (score >= 50) return "Partial match";
  if (score >= 30) return "Weak match";
  return "Poor match";
}

/** A single headline number with a progress ring (one value, so one neutral chart colour). */
export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="stroke-chart-1"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-semibold tabular-nums", size > 100 ? "text-4xl" : "text-xl")}>
          {score}
        </span>
        <span className="text-muted-foreground text-xs">/ 100</span>
      </div>
      <span className="sr-only">
        Match score {score} out of 100: {scoreLabel(score)}
      </span>
    </div>
  );
}
