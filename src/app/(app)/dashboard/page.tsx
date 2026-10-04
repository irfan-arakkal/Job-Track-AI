import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of your job search."
      />
      <ComingSoon
        phase={5}
        description="Your dashboard will show totals, a status breakdown, recent applications and upcoming interviews."
      />
    </>
  );
}
