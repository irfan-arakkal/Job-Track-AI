import {
  applicationInputSchema,
  applicationListQuerySchema,
} from "@/features/applications/schemas";
import { readJson, withAuth } from "@/server/http";
import { createApplication, listApplications } from "@/server/services/applications";

/** GET /api/v1/applications?q=&status=&sort=&page=&pageSize= — the caller's applications. */
export const GET = withAuth(async ({ request, user }) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = applicationListQuerySchema.parse(params);
  return Response.json(await listApplications(user.id, query));
});

/** POST /api/v1/applications — create. Responds 201 with the new record and its URL. */
export const POST = withAuth(async ({ request, user }) => {
  const input = applicationInputSchema.parse(await readJson(request));
  const application = await createApplication(user.id, input);
  return Response.json(application, {
    status: 201,
    headers: { Location: `/api/v1/applications/${application.id}` },
  });
});
