import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/server/auth";

/**
 * The authentication part of our Data Access Layer.
 *
 * These helpers do the *real* session check: they look the session token up in the database.
 * (The proxy only checks that a cookie exists, which anyone can fake.) Every protected page,
 * Server Action and API route must go through one of them.
 */

/**
 * Returns the current session, or null. Wrapped in React's `cache` so a layout and a page that
 * both ask during the same request share one database lookup.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** The signed-in user, or null. Use when a page works for both visitors and users. */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * The signed-in user, or a redirect to /login. Use at the top of protected pages, layouts and
 * Server Actions. The returned `user.id` is what every database query must be scoped to.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session.user;
}
