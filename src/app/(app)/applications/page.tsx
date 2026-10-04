import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Applications" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Applications"
        description="Every job you're tracking, from wishlist to offer."
      />
      <ComingSoon
        phase={4}
        description="Create, edit and track applications through each stage of the hiring process."
      />
    </>
  );
}
