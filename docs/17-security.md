# 17 — Security Review (Phase 14)

This review lists **what is actually implemented and how it was verified**, plus known
limitations. It is not a claim that the application is "secure" — no app is — but a record of the
controls in place and their evidence.

## Summary

| Area                    | Implemented                                                                                                                                                                                                                                                    | Evidence                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Authentication          | Better Auth email/password; scrypt hashes; DB sessions (7 days, sliding); httpOnly + SameSite=Lax + Secure cookies; logout deletes the session row                                                                                                             | Phase 2 tests; curl: cookie flags, logout → 401                                                 |
| Authorization           | Every service function takes `userId` from the session and filters by it; foreign ids → 404; composite foreign keys reject cross-user links in the database                                                                                                    | 30+ ownership tests (integration), E2E isolation test (UI + API)                                |
| Input validation        | Zod on every API route, Server Action and tool; strict PATCH schemas (no mass assignment); DB CHECK constraints                                                                                                                                                | schema unit tests; 422 responses verified with curl                                             |
| SQL injection           | Prisma query builder everywhere; the only raw SQL is parameterised tagged templates (`$queryRaw\`…${value}\``)                                                                                                                                                 | code scan: no `$queryRawUnsafe` with input                                                      |
| XSS                     | React escapes all output; no `dangerouslySetInnerHTML`; AI Markdown rendered without raw HTML; strict nonce-based **CSP** blocks injected scripts                                                                                                              | code scan; CSP header + nonce verified on every page; E2E passes under CSP                      |
| CSRF                    | Better Auth origin check (`403 INVALID_ORIGIN`); Next.js Server Actions origin check; SameSite=Lax cookies; MCP uses bearer tokens (not cookies)                                                                                                               | curl with foreign `Origin` → 403                                                                |
| Rate limiting           | Auth: sign-in 5/min, sign-up 3/min, password change/delete 5/min. App: uploads 10/h, AI analysis 20/day, assistant 60/h, MCP 120/min/token. **Counters in PostgreSQL** (shared across instances, atomic upsert)                                                | concurrency test (20 parallel → exactly 5 allowed); curl: 6th login → 429 even with spoofed IPs |
| Client IP for limits    | Only the header named in `TRUSTED_IP_HEADERS` (set by the hosting proxy) is trusted                                                                                                                                                                            | curl: rotating `X-Forwarded-For` no longer bypasses the limit                                   |
| File uploads            | 5 MB limit (early `Content-Length` check + real size); MIME + extension + `%PDF-` magic bytes; must parse as PDF; random storage keys; private storage; ownership-checked download with `nosniff`, `private, no-store`, encoded filename; path-traversal guard | resume service tests (fake PDFs, 413, traversal)                                                |
| API security            | `withAuth` wrapper on every route; consistent error shape; internal errors logged, never returned; tokens only accepted on `/api/mcp`                                                                                                                          | route scan; error-mapping tests                                                                 |
| MCP tokens              | 256-bit random, SHA-256 hashed at rest, shown once, expiry, revocation, `lastUsedAt`, per-token rate limit; can't mint tokens                                                                                                                                  | MCP integration tests with the official client                                                  |
| AI                      | Untrusted resume/JD/notes treated as data in prompts; AI output validated with Zod before use; read-only tools for the assistant; per-user limits; no user id in any tool                                                                                      | analysis + tools tests                                                                          |
| Secrets & config        | All secrets in env vars validated at startup; `.env` git-ignored; production refuses the placeholder auth secret; empty optional vars treated as unset; nothing secret uses `NEXT_PUBLIC_`                                                                     | env validation; repo scan                                                                       |
| Sensitive data exposure | Explicit field allow-lists in API responses (no password hashes, storage keys or full resume text in lists); `poweredByHeader: false`; generic auth errors                                                                                                     | code review; curl                                                                               |
| Security headers        | CSP (nonce, `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP                                                                                                | curl on pages                                                                                   |
| Account controls        | Change password (signs out other devices); delete account (password re-entry; removes rows **and** stored files)                                                                                                                                               | curl: wrong password → 400; files and rows gone; old session → 401                              |
| Dependencies            | `pnpm audit --prod` clean; pnpm only runs install scripts for allow-listed packages; overrides for two Prisma-CLI transitive packages                                                                                                                          | `pnpm audit` output                                                                             |

## Decisions and trade-offs

- **`style-src 'unsafe-inline'`.** Charts (Recharts) and toasts set inline styles. Scripts remain
  strictly nonce-based; style injection can't run code. Revisit if a nonce-aware chart setup is adopted.
- **Sign-up reveals whether an email exists** (`USER_ALREADY_EXISTS`). Usability trade-off;
  login errors stay generic. Fixable with email verification.
- **Dev dependency advisories** (`mysql2`, `deepmerge-ts`) came only through the Prisma CLI
  (MySQL driver unused; config loader reads our own file). Overridden to patched versions anyway.
- **Not-found pages return HTTP 200** with `noindex` because pages stream (REST API returns real 404s).

## Known limitations / next steps

| Item                                      | Why it matters                                                             | Suggested fix                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| No email verification / password reset    | Account recovery; fake sign-ups                                            | Add an email provider (Resend/Postmark) + Better Auth flows                        |
| No MFA                                    | Stolen-password protection                                                 | Better Auth `twoFactor` plugin (TOTP)                                              |
| Uploaded PDFs aren't virus-scanned        | Files are only served back to their owner as PDFs, but scanning adds depth | ClamAV/cloud scanning on upload                                                    |
| Prompt injection can't be fully prevented | A crafted job description could skew an analysis                           | Already mitigated: data framing, validated output, read-only tools; keep reviewing |
| No audit log                              | Investigating incidents                                                    | Log security events (login, token creation, deletion) to a table                   |
| `TRUSTED_IP_HEADERS` must match the host  | A wrong header re-opens IP spoofing                                        | Set per deployment (see Phase 15 guide)                                            |

## How to re-check

```bash
pnpm test && pnpm test:e2e          # ownership, validation, uploads, MCP, limits, isolation
pnpm audit --prod                   # dependency advisories
curl -sI http://localhost:3000/login   # security headers + CSP
```
