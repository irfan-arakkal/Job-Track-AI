import { withAuth } from "@/server/http";
import { searchCompanies } from "@/server/services/applications";

/** GET /api/v1/companies?q= — the caller's companies, for autocomplete. */
export const GET = withAuth(async ({ request, user }) => {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 200);
  return Response.json(await searchCompanies(user.id, q));
});
