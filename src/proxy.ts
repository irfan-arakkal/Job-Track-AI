import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath } from "@/lib/routes";

/**
 * Runs before every matching request (see `config.matcher`).
 *
 * This is an *optimistic* check: it only looks for the presence of a session cookie, without
 * touching the database, so it's fast enough to run on every navigation. It gives visitors a
 * quick redirect to /login, but it is NOT our security boundary — a fake cookie gets past it.
 * The real check happens in `requireUser()` (src/server/session.ts) next to the data.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isProtectedPath(pathname) && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Note: we deliberately don't redirect signed-in users away from /login here. A stale cookie
  // would cause a redirect loop (/login → /dashboard → /login ...). The (auth) layout does that
  // redirect after a real session check instead.
  return NextResponse.next();
}

export const config = {
  // Skip API routes (they return 401 themselves), Next.js internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
