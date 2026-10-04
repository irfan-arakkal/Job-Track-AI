import {
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Plus,
  Sparkles,
  ThumbsDown,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { StatusBreakdown } from "@/features/dashboard/components/status-breakdown";
import { ReminderList } from "@/features/reminders/components/reminder-list";
import { formatDateTime, formatRelativeDays } from "@/lib/format";
import { interviewTypeLabel } from "@/lib/interviews";
import { getDashboardData } from "@/server/services/dashboard";
import { listReminders, syncRemindersForUser } from "@/server/services/reminders";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];
  const timeZone = user.timezone ?? "UTC";
  // Refresh reminders on every visit, so they work even without the scheduled job.
  await syncRemindersForUser(user.id);
  const [data, reminders] = await Promise.all([getDashboardData(user.id), listReminders(user.id)]);
  const { totals } = data;

  const addButton = (
    <Button asChild>
      <Link href="/applications/new">
        <Plus /> New application
      </Link>
    </Button>
  );

  if (totals.applications === 0) {
    return (
      <>
        <PageHeader
          title={`Welcome, ${firstName}`}
          description="Let's get your job search organised."
        />
        <EmptyState
          icon={Sparkles}
          title="Your dashboard is waiting for data"
          description="Add your first application and this page will show your totals, pipeline and upcoming interviews."
          action={addButton}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of your job search."
        actions={addButton}
      />

      <section aria-label="Key numbers" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Applications"
          value={totals.applications}
          icon={BriefcaseBusiness}
          hint="All tracked jobs"
        />
        <StatCard
          label="This month"
          value={totals.appliedThisMonth}
          icon={CalendarPlus}
          hint="Applied since the 1st"
        />
        <StatCard
          label="Interviews"
          value={totals.interviews}
          icon={CalendarClock}
          hint={`${totals.upcomingInterviews} upcoming`}
        />
        <StatCard label="Offers" value={totals.offers} icon={Trophy} hint="Open or accepted" />
        <StatCard label="Rejections" value={totals.rejections} icon={ThumbsDown} />
      </section>

      {/* minmax(0,1fr): grid columns may shrink below their content, so long titles truncate
          instead of pushing the page wider than a phone screen. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <Card id="reminders" className="scroll-mt-20 lg:col-span-5">
          <CardHeader>
            <CardTitle>
              <h2>Reminders{reminders.length > 0 ? ` (${reminders.length})` : ""}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReminderList reminders={reminders} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Pipeline</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBreakdown data={data.statusBreakdown} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <h2>Upcoming interviews</h2>
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/interviews">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcomingInterviews.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-start gap-3 text-sm">
                <p>No interviews scheduled. Good luck with your applications!</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/interviews/new">
                    <CalendarCheck /> Schedule an interview
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {data.upcomingInterviews.map((interview) => (
                  <li
                    key={interview.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/applications/${interview.application.id}`}
                        className="hover:text-primary block truncate font-medium hover:underline"
                      >
                        {interview.application.company.name} · {interview.application.jobTitle}
                      </Link>
                      <p className="text-muted-foreground truncate text-sm">
                        {interviewTypeLabel[interview.type]} ·{" "}
                        {formatDateTime(interview.scheduledAt, timeZone)}
                      </p>
                    </div>
                    <span className="bg-accent text-accent-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {formatRelativeDays(interview.scheduledAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <h2>Recent applications</h2>
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/applications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recentApplications.map((application) => (
                <li
                  key={application.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/applications/${application.id}`}
                      className="hover:text-primary block truncate font-medium hover:underline"
                    >
                      {application.jobTitle}
                    </Link>
                    <p className="text-muted-foreground truncate text-sm">
                      {application.company.name} · updated{" "}
                      {formatRelativeDays(application.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
