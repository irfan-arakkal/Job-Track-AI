import { FileText, KeyRound, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisForm } from "@/features/analysis/components/analysis-form";
import { scoreLabel } from "@/features/analysis/components/score-ring";
import { formatDate } from "@/lib/format";
import { isAiConfigured } from "@/server/ai/client";
import { db } from "@/server/db";
import { listAnalyses } from "@/server/services/analysis";
import { listResumes } from "@/server/services/resumes";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "AI resume analysis" };
// The Server Action on this page calls the AI; allow it up to 2 minutes on serverless hosts.
export const maxDuration = 120;

export default async function AnalyzePage({ searchParams }: PageProps<"/resumes/analyze">) {
  const user = await requireUser();
  const { applicationId } = await searchParams;
  const [resumes, applications, analyses] = await Promise.all([
    listResumes(user.id),
    db.application.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        jobTitle: true,
        jobDescription: true,
        company: { select: { name: true } },
      },
    }),
    listAnalyses(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="AI resume analysis"
        description="Compare a resume with a job description: match score, skill gaps and concrete suggestions."
      />

      {!isAiConfigured() ? (
        <EmptyState
          icon={KeyRound}
          title="AI isn't set up yet"
          description="Add an ANTHROPIC_API_KEY to the server's environment (see .env.example) and restart the app to enable AI analysis."
        />
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Upload a resume first"
          description="The analysis compares one of your resumes with a job description."
          action={
            <Button asChild>
              <Link href="/resumes">Go to resumes</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>New analysis</h2>
            </CardTitle>
            <CardDescription>Up to 20 analyses per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalysisForm
              resumes={resumes}
              defaultApplicationId={
                typeof applicationId === "string" &&
                applications.some((a) => a.id === applicationId)
                  ? applicationId
                  : undefined
              }
              applications={applications.map((a) => ({
                id: a.id,
                label: `${a.company.name} — ${a.jobTitle}`,
                hasDescription: Boolean(a.jobDescription && a.jobDescription.trim().length >= 100),
              }))}
            />
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="past-analyses" className="mt-8">
        <h2 id="past-analyses" className="text-muted-foreground mb-3 text-sm font-semibold">
          Past analyses
        </h2>
        {analyses.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Sparkles className="size-4" aria-hidden /> Your analyses will appear here.
          </p>
        ) : (
          <ul className="grid gap-2">
            {analyses.map((analysis) => (
              <li key={analysis.id}>
                <Link
                  href={`/resumes/analyses/${analysis.id}`}
                  className="bg-card hover:bg-muted/40 flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {analysis.jobTitle ?? "Untitled role"}
                      {analysis.application ? ` · ${analysis.application.company.name}` : ""}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {analysis.resume.label} · {formatDate(analysis.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-semibold tabular-nums">
                      {analysis.matchScore}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {scoreLabel(analysis.matchScore)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
