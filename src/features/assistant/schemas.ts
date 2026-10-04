import { z } from "zod";

/**
 * A chat request: the conversation so far (the client keeps it; nothing is stored server-side).
 * Bounded so a client can't send huge histories.
 */
export const assistantRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30)
    .refine(
      (messages) => messages[0]?.role === "user",
      "The conversation must start with a user message.",
    )
    .refine(
      (messages) => messages.at(-1)?.role === "user",
      "The last message must be from the user.",
    ),
});

export type AssistantRequest = z.output<typeof assistantRequestSchema>;
