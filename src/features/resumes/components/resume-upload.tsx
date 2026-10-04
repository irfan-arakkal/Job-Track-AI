"use client";

import { AlertCircle, FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFileSize, RESUME_MAX_BYTES } from "@/lib/resumes";

/**
 * Uploads a PDF to /api/v1/resumes. Checks type and size in the browser first for instant
 * feedback — the server repeats every check (and inspects the file's bytes) regardless.
 */
export function ResumeUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function choose(selected: File | undefined) {
    setError(null);
    if (!selected) return setFile(null);
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      return setError("Only PDF files are supported.");
    }
    if (selected.size > RESUME_MAX_BYTES) {
      setFile(null);
      return setError(`That file is ${formatFileSize(selected.size)} — the limit is 5 MB.`);
    }
    setFile(selected);
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      if (label.trim()) body.set("label", label.trim());
      const response = await fetch("/api/v1/resumes", { method: "POST", body });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(data?.error?.message ?? "Upload failed. Please try again.");
      }
      toast.success("Resume uploaded.");
      setFile(null);
      setLabel("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={upload} className="grid gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="resume-file">PDF file (max 5 MB)</Label>
          <Input
            ref={inputRef}
            id="resume-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => choose(event.target.files?.[0])}
            className="cursor-pointer file:mr-3 file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="resume-label">Label (optional)</Label>
          <Input
            id="resume-label"
            value={label}
            maxLength={200}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Frontend – 2026"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground truncate text-sm">
          {file
            ? `${file.name} · ${formatFileSize(file.size)}`
            : "Files stay private to your account."}
        </p>
        <Button type="submit" disabled={!file || isUploading}>
          {isUploading ? <Loader2 className="animate-spin" /> : <FileUp />}
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
