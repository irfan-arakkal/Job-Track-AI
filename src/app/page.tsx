import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { getCurrentUser } from "@/server/session";

const features = [
  "Application tracking with a status pipeline",
  "Interview scheduling and reminders",
  "Private resume storage",
  "AI resume vs. job description analysis",
  "AI assistant grounded in your own data",
  "MCP server for external AI clients",
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6">
        <div className="max-w-2xl space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Your whole job search, organised.
          </h1>
          <p className="text-muted-foreground text-lg">{siteConfig.description}</p>
          <Button asChild size="lg">
            <Link href={user ? "/dashboard" : "/register"}>
              {user ? "Open your dashboard" : "Create a free account"}
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature} className="bg-card rounded-xl border p-4 text-sm shadow-xs">
              {feature}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
