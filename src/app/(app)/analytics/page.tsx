import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <>
      <PageHeader title="Analytics" description="How your job search is going." />
      <ComingSoon
        phase={12}
        description="Charts for applications per month, response rate, interview rate and more."
      />
    </>
  );
}
