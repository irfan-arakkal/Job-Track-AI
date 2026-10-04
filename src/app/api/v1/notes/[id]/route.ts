import { noteInputSchema } from "@/features/applications/schemas";
import { readJson, withAuth } from "@/server/http";
import { deleteNote, updateNote } from "@/server/services/applications";

type Context = RouteContext<"/api/v1/notes/[id]">;

export const PATCH = withAuth<Context>(async ({ request, user, context }) => {
  const { id } = await context.params;
  const { content } = noteInputSchema.parse(await readJson(request));
  return Response.json(await updateNote(user.id, id, content));
});

export const DELETE = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  await deleteNote(user.id, id);
  return new Response(null, { status: 204 });
});
