import { siteConfig } from "@/lib/site";

const plannedFeatures = [
  "Application tracking with status pipeline",
  "Interview scheduling and reminders",
  "Private resume storage",
  "AI resume vs. job description analysis",
  "AI assistant grounded in your own data",
  "MCP server for external AI clients",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6">
      <header className="space-y-4">
        <p className="text-primary text-sm font-medium tracking-wide uppercase">
          Phase 1 · Project setup
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{siteConfig.name}</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">{siteConfig.description}</p>
      </header>

      <section aria-labelledby="planned-heading" className="border-border rounded-xl border p-6">
        <h2 id="planned-heading" className="text-muted-foreground mb-4 text-sm font-semibold">
          Coming in later phases
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {plannedFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <span aria-hidden className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-muted-foreground text-sm">
        Setup check:{" "}
        <a
          href="/api/health"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          /api/health
        </a>{" "}
        should report the database as connected.
      </p>
    </main>
  );
}
