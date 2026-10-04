import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Application not found"
      description="It may have been deleted, or the link is wrong."
      action={
        <Button asChild variant="outline">
          <Link href="/applications">Back to applications</Link>
        </Button>
      }
    />
  );
}
