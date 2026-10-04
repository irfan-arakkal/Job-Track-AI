import { z } from "zod";

import { readJson, withAuth } from "@/server/http";
import { deleteResume, renameResume, setPrimaryResume } from "@/server/services/resumes";

type Context = RouteContext<"/api/v1/resumes/[id]">;

const patchSchema = z
  .object({ label: z.string().trim().min(1).max(200), isPrimary: z.literal(true) })
  .partial()
  .strict();

/** PATCH /api/v1/resumes/:id — { "label": "…" } and/or { "isPrimary": true }. */
export const PATCH = withAuth<Context>(async ({ request, user, context }) => {
  const { id } = await context.params;
  const patch = patchSchema.parse(await readJson(request));
  if (patch.label) await renameResume(user.id, id, patch.label);
  if (patch.isPrimary) await setPrimaryResume(user.id, id);
  return new Response(null, { status: 204 });
});

export const DELETE = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  await deleteResume(user.id, id);
  return new Response(null, { status: 204 });
});
