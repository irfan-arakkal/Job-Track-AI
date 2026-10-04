import { interviewInputSchema, interviewListQuerySchema } from "@/features/interviews/schemas";
import { readJson, withAuth } from "@/server/http";
import { createInterview, listInterviews } from "@/server/services/interviews";

/** GET /api/v1/interviews?view=upcoming|past|all&status=&from=&to= */
export const GET = withAuth(async ({ request, user }) => {
  const query = interviewListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return Response.json(await listInterviews(user.id, query));
});

/** POST /api/v1/interviews — scheduledAt as ISO with offset, or local time in the user's zone. */
export const POST = withAuth(async ({ request, user }) => {
  const input = interviewInputSchema.parse(await readJson(request));
  const interview = await createInterview(user.id, user.timezone ?? "UTC", input);
  return Response.json(interview, {
    status: 201,
    headers: { Location: `/api/v1/interviews/${interview.id}` },
  });
});
