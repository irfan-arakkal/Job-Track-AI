import { applicationPatchSchema } from "@/features/applications/schemas";
import { readJson, withAuth } from "@/server/http";
import {
  deleteApplication,
  getApplicationOrThrow,
  updateApplication,
} from "@/server/services/applications";

type Context = RouteContext<"/api/v1/applications/[id]">;

/** GET /api/v1/applications/:id — detail with company, interviews, notes and history. */
export const GET = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  return Response.json(await getApplicationOrThrow(user.id, id));
});

/** PATCH /api/v1/applications/:id — partial update; omitted fields stay unchanged. */
export const PATCH = withAuth<Context>(async ({ request, user, context }) => {
  const { id } = await context.params;
  const patch = applicationPatchSchema.parse(await readJson(request));
  return Response.json(await updateApplication(user.id, id, patch));
});

/** DELETE /api/v1/applications/:id — removes it with its interviews, notes and history. */
export const DELETE = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  await deleteApplication(user.id, id);
  return new Response(null, { status: 204 });
});
