import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Chat } from "@/features/assistant/components/chat";
import { isAiConfigured } from "@/server/ai/client";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your job search. It reads your data but never changes it."
      />
      {isAiConfigured() ? (
        <Chat />
      ) : (
        <EmptyState
          icon={KeyRound}
          title="AI isn't set up yet"
          description="Add an ANTHROPIC_API_KEY to the server's environment (see .env.example) and restart the app to enable the assistant."
        />
      )}
    </>
  );
}
