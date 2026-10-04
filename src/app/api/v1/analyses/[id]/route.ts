import { NotFoundError } from "@/server/errors";
import { withAuth } from "@/server/http";
import { deleteAnalysis, getAnalysis } from "@/server/services/analysis";

type Context = RouteContext<"/api/v1/analyses/[id]">;

export const GET = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  const analysis = await getAnalysis(user.id, id);
  if (!analysis) throw new NotFoundError("Analysis");
  return Response.json(analysis);
});

export const DELETE = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  await deleteAnalysis(user.id, id);
  return new Response(null, { status: 204 });
});
