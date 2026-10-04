import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth";

// Every request to /api/auth/* (sign-up, sign-in, sign-out, get-session, ...) is handled by
// Better Auth, which applies its origin (CSRF) check and rate limiting before doing anything.
export const { GET, POST } = toNextJsHandler(auth);
