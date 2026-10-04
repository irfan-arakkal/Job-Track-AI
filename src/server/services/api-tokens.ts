import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";

/*
 * Personal access tokens for MCP clients.
 *
 * - Tokens are 32 random bytes (256 bits), shown to the user ONCE.
 * - Only a SHA-256 hash is stored. A fast hash is fine here (unlike passwords) because the
 *   token is long and random — there's nothing to brute-force. A database leak reveals no
 *   usable tokens.
 * - Tokens can be revoked and can expire.
 */

const TOKEN_PREFIX = "jt_";
const MAX_ACTIVE_TOKENS = 10;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createApiToken(userId: string, name: string, expiresInDays?: number | null) {
  const active = await db.apiToken.count({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (active >= MAX_ACTIVE_TOKENS) {
    throw new ValidationError(
      `You can have up to ${MAX_ACTIVE_TOKENS} active tokens. Revoke one first.`,
    );
  }
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const record = await db.apiToken.create({
    data: {
      userId,
      name,
      prefix: token.slice(0, 7),
      tokenHash: hashToken(token),
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
    },
    select: { id: true, name: true, prefix: true, createdAt: true, expiresAt: true },
  });
  // The plaintext token is returned only here and never stored.
  return { ...record, token };
}

export async function listApiTokens(userId: string) {
  return db.apiToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
}

export async function revokeApiToken(userId: string, tokenId: string) {
  const { count } = await db.apiToken.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new NotFoundError("Token");
}

/**
 * Resolves a bearer token to its user, or null if it's unknown, revoked or expired.
 * Lookup is by hash, so the plaintext is never compared or stored.
 */
export async function authenticateApiToken(token: string | null | undefined, now = new Date()) {
  if (!token?.startsWith(TOKEN_PREFIX) || token.length > 100) return null;
  const record = await db.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      lastUsedAt: true,
      user: { select: { id: true, timezone: true } },
    },
  });
  if (!record || record.revokedAt || (record.expiresAt && record.expiresAt <= now)) return null;

  // Record usage, at most once a minute to avoid a write on every request.
  if (!record.lastUsedAt || now.getTime() - record.lastUsedAt.getTime() > 60_000) {
    await db.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: now } });
  }
  return { tokenId: record.id, userId: record.user.id, timeZone: record.user.timezone };
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}
