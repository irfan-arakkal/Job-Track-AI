import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Resumes" };

export default function Page() {
  return (
    <>
      <PageHeader title="Resumes" description="Your uploaded resumes." />
      <ComingSoon
        phase={7}
        description="Upload PDF resumes, keep them private, and choose a primary resume."
      />
    </>
  );
}
