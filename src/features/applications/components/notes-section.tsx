"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNoteAction, deleteNoteAction } from "@/features/applications/actions";

type Note = { id: string; content: string; createdAt: Date };

export function NotesSection({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startSaving(async () => {
      const result = await addNoteAction(applicationId, { content });
      if (!result.ok) {
        setError(result.fieldErrors?.content?.[0] ?? result.message);
        return;
      }
      setContent("");
      router.refresh();
    });
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    const result = await deleteNoteAction(applicationId, noteId);
    setDeletingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleAdd} className="grid gap-2">
        <label htmlFor="new-note" className="sr-only">
          New note
        </label>
        <Textarea
          id="new-note"
          rows={3}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Recruiter call, referral, prep notes…"
          aria-invalid={!!error}
          aria-describedby={error ? "new-note-error" : undefined}
        />
        {error ? (
          <p id="new-note-error" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="sm"
          className="justify-self-end"
          disabled={isSaving || !content.trim()}
        >
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          Add note
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notes yet.</p>
      ) : (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id} className="group rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  aria-label="Delete note"
                >
                  {deletingId === note.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(note.createdAt),
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
