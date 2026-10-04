# 10 — Resume Management (Phase 7)

## Upload pipeline (`POST /api/v1/resumes`, `src/server/services/resumes.ts`)

1. **Authenticate** (`withAuth`) and **rate-limit**: 10 uploads per user per hour.
2. **Size**: reject early from `Content-Length`, then check the real size — max **5 MB** → `413`.
3. **Type**: MIME type `application/pdf` _and_ a `.pdf` name _and_ the file's first bytes must be
   `%PDF-` (the "magic number"). Type and name come from the browser and can be faked; the bytes
   can't → otherwise `415`.
4. **Parse**: extract the text with `unpdf` (pdf.js). If it can't be parsed it's not a usable
   PDF → `422`. The text (max 100k chars) is stored for AI analysis in Phase 8.
5. **Limit**: at most 20 resumes per user.
6. **Store** under a random key `resumes/<userId>/<uuid>.pdf` — never the user's file name, which is
   only kept (sanitised) for display.
7. **Save metadata**; if that fails, the stored file is deleted (no orphans). The first resume
   becomes primary automatically.

## Keeping files private

- Files are **not** in `/public` and have **no public URL**. Locally they live in `./storage`
  (git-ignored); in production in a private S3/R2 bucket.
- The only way to read one is `GET /api/v1/resumes/:id/file`, which checks the session **and**
  ownership (`404` for anyone else, `401` when signed out).
- Response headers: `Content-Type: application/pdf`, `X-Content-Type-Options: nosniff` (the
  browser must not reinterpret it as HTML), `Cache-Control: private, no-store`, and an RFC 5987
  encoded `Content-Disposition` file name (safe for any characters, no header injection).
- `LocalStorage` refuses keys that escape its folder (`../../etc/passwd`) — path traversal.

## Storage abstraction (`src/server/storage`)

```ts
interface FileStorage {
  put(key, bytes, type);
  get(key);
  delete(key);
}
```

`STORAGE_DRIVER=local` (default) or `s3` (AWS S3, Cloudflare R2, MinIO via `S3_ENDPOINT`).
Serverless hosts such as Vercel have no persistent disk, so production uses `s3`.

## Primary resume

Exactly one primary per user, enforced by the partial unique index from Phase 3. Switching runs
in a transaction that unsets the old primary before setting the new one; deleting the primary
promotes the newest remaining resume.

## API

| Method | Path                                    | Notes                                       |
| ------ | --------------------------------------- | ------------------------------------------- |
| GET    | `/api/v1/resumes`                       | metadata only (no storage key, no text)     |
| POST   | `/api/v1/resumes`                       | multipart `file`, optional `label`          |
| PATCH  | `/api/v1/resumes/:id`                   | `{ "label": "…" }`, `{ "isPrimary": true }` |
| DELETE | `/api/v1/resumes/:id`                   | deletes row, then file                      |
| GET    | `/api/v1/resumes/:id/file[?download=1]` | inline view or download                     |

## Known limitations

- The rate limiter is in memory (per server process) — see Phase 14/15.
- Files are not virus-scanned; they're only ever served back to their owner as PDFs.

Tests: `tests/unit/pdf.test.ts`, `tests/unit/local-storage.test.ts`,
`tests/integration/resume-service.test.ts` (valid/invalid uploads, 413, sanitising, primary
switching, cross-user access).
