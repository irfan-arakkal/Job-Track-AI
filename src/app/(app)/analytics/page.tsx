import {
  BarChart3,
  Clock,
  Mail,
  MessageSquareReply,
  Plus,
  ThumbsDown,
  Trophy,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalBarChart, MonthlyColumnChart } from "@/features/analytics/components/charts";
import { DataTable } from "@/features/analytics/components/data-table";
import { analyticsRanges, type AnalyticsRange } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getAnalytics } from "@/server/services/analytics";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Analytics" };

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Mail;
}) {
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

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const user = await requireUser();
  const { range: rawRange } = await searchParams;
  const range: AnalyticsRange = analyticsRanges.some((r) => r.value === rawRange)
    ? (rawRange as AnalyticsRange)
    : "6m";
  const data = await getAnalytics(user.id, range);
  const { totals, responseTime } = data;
  const pct = (n: number) => `${Math.round(n)}%`;
  const days = (n: number | null) =>
    n === null ? "—" : `${n < 10 ? n.toFixed(1) : Math.round(n)} days`;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="How your job search is going, and where responses come from."
      />

      {/* Filters live in one row above the charts; the range is in the URL so views are shareable. */}
      <nav
        aria-label="Time range"
        className="bg-muted/40 mb-6 inline-flex flex-wrap rounded-lg border p-1"
      >
        {analyticsRanges.map((option) => (
          <Link
            key={option.value}
            href={`/analytics?range=${option.value}`}
            aria-current={range === option.value ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              range === option.value
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {totals.sentApplications === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No applications in this period"
          description="Analytics appear once you've applied to jobs. Try a longer time range or add an application."
          action={
            <Button asChild>
              <Link href="/applications/new">
                <Plus /> New application
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <section
            aria-label="Key rates"
            className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"
          >
            <Metric
              label="Applications"
              value={String(totals.sentApplications)}
              hint="Sent in this period"
              icon={Mail}
            />
            <Metric
              label="Response rate"
              value={pct(totals.responseRatePercent)}
              hint="Got any reply"
              icon={MessageSquareReply}
            />
            <Metric
              label="Interview rate"
              value={pct(totals.interviewRatePercent)}
              hint="Reached an interview"
              icon={Users}
            />
            <Metric
              label="Offer rate"
              value={pct(totals.offerRatePercent)}
              hint="Got an offer"
              icon={Trophy}
            />
            <Metric
              label="Rejection rate"
              value={pct(totals.rejectionRatePercent)}
              icon={ThumbsDown}
            />
            <Metric
              label="Avg. response time"
              value={days(responseTime.averageDays)}
              hint={
                responseTime.responses
                  ? `Median ${days(responseTime.medianDays)} · ${responseTime.responses} replies`
                  : "No replies yet"
              }
              icon={Clock}
            />
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  <h2>Applications per month</h2>
                </CardTitle>
                <CardDescription>By the date you applied.</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyColumnChart data={data.perMonth} />
                <DataTable
                  caption="Applications per month"
                  columns={["Month", "Applications"]}
                  rows={data.perMonth.map((m) => [m.label, m.count])}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>By company</h2>
                </CardTitle>
                <CardDescription>Top companies you applied to.</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={data.byCompany} />
                <DataTable
                  caption="Applications by company"
                  columns={["Company", "Applications"]}
                  rows={data.byCompany.map((c) => [c.name, c.count])}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>By location</h2>
                </CardTitle>
                <CardDescription>Where the roles are.</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={data.byLocation} />
                <DataTable
                  caption="Applications by location"
                  columns={["Location", "Applications"]}
                  rows={data.byLocation.map((l) => [l.name, l.count])}
                />
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground mt-6 text-xs">
            Rates are a share of applications sent in the period and use each application&apos;s
            full status history, so an interview that later ended in a rejection still counts
            towards the interview rate.
          </p>
        </>
      )}
    </>
  );
}
