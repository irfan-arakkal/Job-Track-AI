import { unauthenticated } from "@/server/http";
import { getCurrentUser } from "@/server/session";

/**
 * GET /api/v1/me — the signed-in user's own profile.
 *
 * This is the pattern every API route follows: identify the caller from their session first,
 * return 401 if there is none, and only ever return data belonging to that caller.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthenticated();
  }

  // Return an explicit allow-list of fields rather than the whole user object, so adding a
  // sensitive column later can never leak it by accident.
  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}
