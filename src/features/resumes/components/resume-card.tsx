"use client";

import { Eye, FileText, Loader2, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteResumeAction, setPrimaryResumeAction } from "@/features/resumes/actions";
import { formatDate } from "@/lib/format";
import { formatFileSize } from "@/lib/resumes";

type Props = {
  resume: {
    id: string;
    label: string;
    originalFileName: string;
    sizeBytes: number;
    isPrimary: boolean;
    createdAt: Date;
  };
};

export function ResumeCard({ resume }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <li className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FileText className="text-muted-foreground size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{resume.label}</p>
            {resume.isPrimary ? (
              <Badge variant="secondary">
                <Star aria-hidden /> Primary
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate text-sm">
            {resume.originalFileName} · {formatFileSize(resume.sizeBytes)} · uploaded{" "}
            {formatDate(resume.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/v1/resumes/${resume.id}/file`} target="_blank" rel="noopener noreferrer">
            <Eye /> View
          </a>
        </Button>
        {!resume.isPrimary ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => setPrimaryResumeAction(resume.id), "Primary resume updated.")}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Star />}
            Make primary
          </Button>
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              aria-label={`Delete ${resume.label}`}
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Delete “{resume.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The file is removed permanently. Applications that used it will keep their details.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => run(() => deleteResumeAction(resume.id), "Resume deleted.")}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
