"use client";

import {
  BellRing,
  CalendarClock,
  Check,
  Clock,
  MailQuestion,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setReminderStatusAction } from "@/features/reminders/actions";
import type { ReminderType } from "@/lib/reminders";

type Reminder = {
  id: string;
  type: ReminderType;
  title: string;
  applicationId: string | null;
  interviewId: string | null;
};

const icons: Record<ReminderType, LucideIcon> = {
  NO_RESPONSE: MailQuestion,
  FOLLOW_UP: Clock,
  INTERVIEW_TODAY: BellRing,
  INTERVIEW_TOMORROW: CalendarClock,
};

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Remove the reminder from the list immediately; restore it if the server call fails.
  const [visible, removeOptimistically] = useOptimistic(reminders, (current, id: string) =>
    current.filter((r) => r.id !== id),
  );

  function update(id: string, status: "DONE" | "DISMISSED") {
    startTransition(async () => {
      removeOptimistically(id);
      const result = await setReminderStatusAction(id, status);
      if (!result.ok) toast.error(result.message);
      router.refresh();
    });
  }

  if (visible.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        You&apos;re all caught up — no reminders right now.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {visible.map((reminder) => {
        const Icon = icons[reminder.type];
        const href = reminder.interviewId
          ? `/interviews/${reminder.interviewId}/edit`
          : reminder.applicationId
            ? `/applications/${reminder.applicationId}`
            : null;
        return (
          <li key={reminder.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="bg-accent flex size-8 shrink-0 items-center justify-center rounded-full">
              <Icon className="text-accent-foreground size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              {href ? (
                <Link href={href} className="hover:text-primary hover:underline">
                  {reminder.title}
                </Link>
              ) : (
                reminder.title
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => update(reminder.id, "DONE")}
                aria-label={`Mark done: ${reminder.title}`}
              >
                <Check />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => update(reminder.id, "DISMISSED")}
                aria-label={`Dismiss: ${reminder.title}`}
              >
                <X />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
