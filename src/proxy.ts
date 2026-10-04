import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath } from "@/lib/routes";

/**
 * Content Security Policy with a fresh nonce per request.
 *
 * CSP tells the browser which scripts may run. Scripts need this request's random nonce
 * (Next.js adds it to its own scripts automatically), so an injected <script> — the classic XSS
 * payload — is refused even if an attacker got HTML into a page. Styles allow 'unsafe-inline'
 * because charts and toasts set inline styles; style injection is far less dangerous than script
 * injection and is documented as an accepted trade-off.
 */
function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'unsafe-eval' only in development (React uses eval for debugging there, never in production).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    // Resumes are shown by the browser's PDF viewer from our own origin.
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Runs before every matching page request (see `config.matcher`):
 *  1. Optimistic auth check — no session cookie on a protected page → redirect to /login.
 *     NOT the security boundary (a fake cookie passes); `requireUser()` does the real check.
 *  2. Adds the Content Security Policy header.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isProtectedPath(pathname) && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Note: signed-in users aren't redirected away from /login here — a stale cookie would cause a
  // redirect loop. The (auth) layout does that after a real session check.

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  // Next.js reads the CSP from the request headers to apply the nonce to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Pages only: skip API routes (they return JSON and set their own headers), Next.js internals,
  // static files, and prefetches (which don't need a fresh nonce).
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
