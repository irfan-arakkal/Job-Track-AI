"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client. Its methods send requests to /api/auth/* on our own origin, where
 * Better Auth applies rate limiting and CSRF (origin) checks before touching the database.
 */
export const authClient = createAuthClient();
