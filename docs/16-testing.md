# 16 — Testing (Phase 13)

## The test pyramid

| Layer           | Tool                                           | Count | What it proves                                                                                                                                                                                                                                      | Command                 |
| --------------- | ---------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Unit**        | Vitest                                         | 70    | pure logic: validation schemas, time zones & DST, reminder rules, analytics maths, formatting, safe redirects, AI error mapping, PDF checks, path-traversal guard                                                                                   | `pnpm test:unit`        |
| **Integration** | Vitest + real PostgreSQL (`jobtrack_test`)     | 83    | services + database together: ownership isolation for every entity, constraints (composite FKs, CHECKs, partial unique index), uploads, AI analysis with a fake model, assistant tools, **MCP via the official MCP client**, reminders, analytics   | `pnpm test:integration` |
| **End-to-end**  | Playwright + production build (`jobtrack_e2e`) | 8     | real browser flows: register → empty dashboard → log out; login redirect back; wrong password; create → status change → note → dashboard → search → edit → delete; **user B can't see or change user A's data (UI + API)**; AI-not-configured state | `pnpm test:e2e`         |

Run everything fast: `pnpm test`. Coverage of the business logic (`src/server`, `src/lib`, schemas):
`pnpm test:coverage` → **~80% of lines** (UI components and pages are covered by the E2E tests instead).

## Principles

- **Real database, not mocks**, for integration tests: the bugs that matter here (a missing
  `userId` filter, a broken constraint) only show up against Postgres. Each test truncates the
  tables first (`tests/support/db.ts`), and the helper refuses to run unless the URL contains `test`.
- **Separate databases** for dev, integration tests and E2E, so test runs never touch your data.
- **No paid API calls in tests.** The AI analyzer is injected (fake in tests); the assistant/MCP tool
  layer is tested directly; SDK error mapping uses the SDK's real error classes.
- **Tests that can fail.** The ownership tests were checked by deliberately removing a `userId`
  filter — the test failed, then passed again once restored.
- **Error cases, not just happy paths:** invalid input, foreign IDs, revoked/expired tokens, fake
  PDFs, oversized files, invalid AI output, rate limits, DST edge cases.

## End-to-end setup

- `playwright.config.ts` builds and starts the app on port 3100 with `DATABASE_URL=E2E_DATABASE_URL`.
- `tests/e2e/global-setup.ts` applies migrations, wipes the E2E database and seeds two users
  (`seed-users.ts`, run with `tsx`).
- `auth.setup.ts` signs in once per user and saves the session (`storageState`), keeping the
  number of logins under the auth rate limit.
- Selectors use roles and labels (`getByRole`, `getByLabel`) — the same way assistive technology sees
  the page — which also checks accessibility basics.

First time on a new machine: `pnpm exec playwright install chromium`.

## Bugs the tests caught while building

- Emails with a trailing space (autofill) were rejected → trim before validating (Phase 3).
- Reminder/interview times around DST changes picked the wrong instant → "compatible" disambiguation (Phase 6).
- The time-zone picker couldn't show `Asia/Kolkata` (runtime lists `Asia/Calcutta`) (Phase 6).
- React 19 reset the AI analysis form after a validation error, wiping the pasted job description (Phase 8).
- An empty optional env var (`ANTHROPIC_API_KEY=""`) stopped the app from starting (Phase 13).

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

- **check:** typecheck, lint, format, unit + integration tests (Postgres service), production build;
- **e2e:** Playwright against a production build (Postgres service); the HTML report is uploaded if it fails.
