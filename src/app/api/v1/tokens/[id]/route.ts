import { withAuth } from "@/server/http";
import { revokeApiToken } from "@/server/services/api-tokens";

export const DELETE = withAuth<RouteContext<"/api/v1/tokens/[id]">>(async ({ user, context }) => {
  const { id } = await context.params;
  await revokeApiToken(user.id, id);
  return new Response(null, { status: 204 });
});
