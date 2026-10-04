"use client";

import { AlertCircle, Bot, Loader2, RotateCcw, SendHorizontal, User, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; toolsUsed?: string[] };

const SUGGESTIONS = [
  "How many applications did I submit this month?",
  "Which companies haven't responded?",
  "What interviews do I have next week?",
  "Which applications should I follow up on?",
];

const TOOL_LABELS: Record<string, string> = {
  get_applications: "applications",
  get_application: "application details",
  get_interviews: "interviews",
  get_statistics: "statistics",
  get_follow_up_candidates: "follow-ups",
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  async function send(text: string, history = messages) {
    const content = text.trim();
    if (!content || isLoading) return;
    const next: Message[] = [...history, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only role + content go to the server (keep the last 30 messages).
        body: JSON.stringify({
          messages: next.slice(-30).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        { reply: string; toolsUsed: string[] } | { error?: { message?: string } } | null;
      if (!response.ok || !data || !("reply" in data)) {
        throw new Error(
          (data && "error" in data && data.error?.message) || "Something went wrong.",
        );
      }
      setMessages([...next, { role: "assistant", content: data.reply, toolsUsed: data.toolsUsed }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Something went wrong.");
      // Put the text back so the user can retry without retyping.
      setMessages(history);
      setInput(content);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-card flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col rounded-xl border">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="bg-accent flex size-12 items-center justify-center rounded-full">
              <Bot className="text-accent-foreground size-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="font-semibold">Ask about your job search</h2>
              <p className="text-muted-foreground text-sm">
                Answers come from your own applications and interviews.
              </p>
            </div>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {message.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <div className={cn("max-w-[85%] space-y-1", message.role === "user" && "text-right")}>
                <span className="sr-only">
                  {message.role === "user" ? "You said:" : "Assistant:"}
                </span>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-left text-sm",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    // Markdown without raw HTML: formatting only, no injected markup.
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {message.toolsUsed && message.toolsUsed.length > 0 ? (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Wrench className="size-3" aria-hidden />
                    Checked your {message.toolsUsed.map((t) => TOOL_LABELS[t] ?? t).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <span className="bg-accent flex size-8 items-center justify-center rounded-full">
              <Loader2 className="text-accent-foreground size-4 animate-spin" aria-hidden />
            </span>
            Looking at your data…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {error ? (
        <div
          role="alert"
          className="bg-destructive/5 text-destructive flex items-center gap-2 border-t px-4 py-2 text-sm"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden /> {error}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        {messages.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            aria-label="Start a new conversation"
            disabled={isLoading}
          >
            <RotateCcw />
          </Button>
        ) : null}
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <Textarea
          id="chat-input"
          rows={1}
          value={input}
          maxLength={4000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter adds a new line.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask about your applications, interviews or follow-ups…"
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send">
          {isLoading ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
        </Button>
      </form>
    </div>
  );
}
