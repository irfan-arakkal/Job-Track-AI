import { noteInputSchema } from "@/features/applications/schemas";
import { readJson, withAuth } from "@/server/http";
import { addNote, listNotes } from "@/server/services/applications";

type Context = RouteContext<"/api/v1/applications/[id]/notes">;

export const GET = withAuth<Context>(async ({ user, context }) => {
  const { id } = await context.params;
  return Response.json(await listNotes(user.id, id));
});

export const POST = withAuth<Context>(async ({ request, user, context }) => {
  const { id } = await context.params;
  const { content } = noteInputSchema.parse(await readJson(request));
  return Response.json(await addNote(user.id, id, content), { status: 201 });
});
