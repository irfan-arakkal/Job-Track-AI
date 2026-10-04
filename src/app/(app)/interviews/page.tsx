import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Interviews" };

export default function Page() {
  return (
    <>
      <PageHeader title="Interviews" description="Upcoming and past interviews." />
      <ComingSoon
        phase={6}
        description="Schedule interviews against your applications and keep notes for each one."
      />
    </>
  );
}
