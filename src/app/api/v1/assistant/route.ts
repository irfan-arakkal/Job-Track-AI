import { assistantRequestSchema } from "@/features/assistant/schemas";
import { runAssistant } from "@/server/ai/assistant";
import { readJson, withAuth } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";

export const maxDuration = 120;

/**
 * POST /api/v1/assistant — { messages: [{ role, content }, …] } → { reply, toolsUsed }.
 * The assistant can only read the signed-in user's data (tools are scoped by the session).
 */
export const POST = withAuth(async ({ request, user }) => {
  checkRateLimit(`assistant:${user.id}`, 60, 60 * 60 * 1000); // 60 messages per hour
  const { messages } = assistantRequestSchema.parse(await readJson(request));
  const result = await runAssistant(
    { userId: user.id, timeZone: user.timezone ?? "UTC" },
    messages,
  );
  return Response.json(result);
});
