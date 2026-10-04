import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "AI Assistant" };

export default function Page() {
  return (
    <>
      <PageHeader title="AI Assistant" description="Ask questions about your job search." />
      <ComingSoon
        phase={9}
        description="Chat with an assistant that answers using only your own application data."
      />
    </>
  );
}
