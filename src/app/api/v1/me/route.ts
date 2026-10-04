import { withAuth } from "@/server/http";

/**
 * GET /api/v1/me — the signed-in user's own profile.
 * Returns an explicit allow-list of fields so a sensitive column added later can't leak.
 */
export const GET = withAuth(async ({ user }) => {
  return Response.json({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  });
});
