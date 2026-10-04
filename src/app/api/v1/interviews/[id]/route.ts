import { interviewPatchSchema } from "@/features/interviews/schemas";
import { NotFoundError } from "@/server/errors";
import { readJson, withAuth } from "@/server/http";
import { deleteInterview, getInterview, updateInterview } from "@/server/services/interviews";

type Context = RouteContext<"/api/v1/interviews/[id]">;

export const GET = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  const interview = await getInterview(user.id, id);
  if (!interview) throw new NotFoundError("Interview");
  return Response.json(interview);
});

export const PATCH = withAuth<Context>(async ({ request, user, context }) => {
  const { id } = await context.params;
  const patch = interviewPatchSchema.parse(await readJson(request));
  return Response.json(await updateInterview(user.id, user.timezone ?? "UTC", id, patch));
});

export const DELETE = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  await deleteInterview(user.id, id);
  return new Response(null, { status: 204 });
});
