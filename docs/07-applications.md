# 07 — Job Applications (Phase 4)

## Layers

```
UI (React)                         REST client (curl, MCP later)
  │ Server Actions                   │ /api/v1/applications…
  ▼ src/features/applications/       ▼ src/app/api/v1/…
  actions.ts ──────────┐   ┌──────── route.ts (withAuth)
                       ▼   ▼
        Zod schemas (src/features/applications/schemas.ts) — same rules everywhere
                       │
                       ▼
        Service (src/server/services/applications.ts) — userId first, business rules
                       │
                       ▼
                 Prisma → PostgreSQL (composite FKs, CHECK constraints)
```

Server Actions and REST routes are both thin: authenticate → validate → call the service. So a
rule (e.g. "moving off the wishlist sets the applied date") lives in exactly one place.

## Business rules (service)

| Rule                                                                           | Where                 |
| ------------------------------------------------------------------------------ | --------------------- |
| Company is found by name **ignoring case** or created — per user               | `findOrCreateCompany` |
| Status other than Wishlist ⇒ applied date defaults to today                    | `resolveAppliedAt`    |
| Every status change writes a `StatusChange` row; unchanged status writes none  | `updateApplication`   |
| PATCH validates salary min ≤ max against the **merged** stored + new values    | `updateApplication`   |
| Someone else's record ⇒ `NotFoundError` (404), never "forbidden"               | all functions         |
| Adding a note bumps the application's `updatedAt` ("recently updated" sorting) | `addNote`             |

## Validation (Zod)

One schema serves the browser form (strings), Server Actions and JSON API requests:
empty strings become `null` ("clear"), `"85,000"` becomes `85000`, dates become midnight UTC,
URLs must be `http(s)` (blocks `javascript:` links), and the PATCH schema is `.strict()` so
unexpected keys such as `userId` are rejected (prevents **mass assignment**).

## REST API

| Method               | Path                                                                             | Success                                           |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| GET                  | `/api/v1/applications?q=&status=&sort=updated\|applied\|company&page=&pageSize=` | 200 `{ items, total, page, pageSize, pageCount }` |
| POST                 | `/api/v1/applications`                                                           | 201 + `Location`                                  |
| GET / PATCH / DELETE | `/api/v1/applications/:id`                                                       | 200 / 200 / 204                                   |
| PATCH                | `/api/v1/applications/:id/status` `{ "status": "INTERVIEW" }`                    | 200                                               |
| GET / POST           | `/api/v1/applications/:id/notes`                                                 | 200 / 201                                         |
| PATCH / DELETE       | `/api/v1/notes/:id`                                                              | 200 / 204                                         |
| GET                  | `/api/v1/companies?q=`                                                           | 200                                               |

Errors: `401` not signed in, `400` malformed JSON, `404` missing or not yours, `422` validation
(with `details.fieldErrors`), `500` generic message (details only in server logs).

## UI states

- **Loading:** `(app)/loading.tsx` skeleton while the server fetches.
- **Empty:** "No applications yet" (with a call to action) vs. "No matching applications" (with "Clear filters").
- **Error:** `(app)/error.tsx`; form errors appear next to each field and in an alert.
- **Success:** toasts, and the page data refreshes via `revalidatePath`.

Filters live in the URL (`?q=react&status=INTERVIEW`), so views are shareable and the back
button works. Search is debounced (300 ms). The status dropdown updates optimistically and rolls
back if the server rejects the change.

## Security notes

- Job descriptions and notes are rendered as text — React escapes them, so pasted HTML can't run.
- External job links open with `rel="noopener noreferrer nofollow"`.
- A missing application renders the not-found UI; because the layout streams, the HTML status is
  200 with a `noindex` tag (the REST API returns a real 404).
