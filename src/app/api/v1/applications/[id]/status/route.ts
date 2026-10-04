import { statusChangeSchema } from "@/features/applications/schemas";
import { readJson, withAuth } from "@/server/http";
import { changeApplicationStatus } from "@/server/services/applications";

/** PATCH /api/v1/applications/:id/status — { "status": "INTERVIEW" }. Records history. */
export const PATCH = withAuth<RouteContext<"/api/v1/applications/[id]/status">>(
  async ({ request, user, context }) => {
    const { id } = await context.params;
    const { status } = statusChangeSchema.parse(await readJson(request));
    return Response.json(await changeApplicationStatus(user.id, id, status));
  },
);
