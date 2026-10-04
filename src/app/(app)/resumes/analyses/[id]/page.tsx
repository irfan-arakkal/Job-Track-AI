import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Lightbulb,
  PenLine,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing, scoreLabel } from "@/features/analysis/components/score-ring";
import { formatDate } from "@/lib/format";
import { getAnalysis } from "@/server/services/analysis";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Analysis result" };

function ResultList({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="marker:text-muted-foreground grid list-disc gap-2 pl-5 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AnalysisResultPage({ params }: PageProps<"/resumes/analyses/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const analysis = await getAnalysis(user.id, id);
  if (!analysis || !analysis.result) notFound();
  const { result } = analysis;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/resumes/analyze">
          <ArrowLeft /> All analyses
        </Link>
      </Button>

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreRing score={result.matchScore} />
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <p className="text-primary text-sm font-medium">{scoreLabel(result.matchScore)}</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {analysis.jobTitle ?? "Resume analysis"}
              {analysis.application ? ` at ${analysis.application.company.name}` : ""}
            </h1>
            {/* AI text is rendered as plain text (escaped by React), never as HTML. */}
            <p className="text-muted-foreground">{result.summary}</p>
            <p className="text-muted-foreground text-xs">
              Resume: {analysis.resume.label} · {formatDate(analysis.createdAt)} · {analysis.model}
              {analysis.application ? (
                <>
                  {" · "}
                  <Link href={`/applications/${analysis.application.id}`} className="underline">
                    View application
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ResultList
          title="Matching skills"
          icon={CheckCircle2}
          items={result.matchingSkills}
          empty="No clear matches found."
        />
        <ResultList
          title="Missing skills"
          icon={XCircle}
          items={result.missingSkills}
          empty="No major gaps found."
        />
        <ResultList
          title="Relevant experience"
          icon={Briefcase}
          items={result.relevantExperience}
          empty="Nothing directly relevant found."
        />
        <ResultList
          title="Weak areas"
          icon={AlertTriangle}
          items={result.weakAreas}
          empty="No weak areas flagged."
        />
        <ResultList
          title="Improve your resume"
          icon={PenLine}
          items={result.resumeSuggestions}
          empty="No suggestions."
        />
        <ResultList
          title="Tailor this application"
          icon={Target}
          items={result.tailoringSuggestions}
          empty="No suggestions."
        />
      </div>
      <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        AI-generated feedback can be wrong. Treat it as a second opinion, not a verdict.
      </p>
    </>
  );
}
