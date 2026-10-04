# 09 — Interviews (Phase 6)

## Time zones — the interesting part

An interview is an **instant** (stored in UTC). A person types a **wall-clock time** ("10:00 on
5 March") that means 10:00 _in their time zone_. JobTrack stores each user's IANA zone
(`users.timezone`, e.g. `Asia/Kolkata`, editable in Settings) and converts at the edges:

| Direction             | Function (`src/lib/timezone.ts`)                                                              |
| --------------------- | --------------------------------------------------------------------------------------------- |
| form value → database | `zonedLocalToUtc("2026-03-05T10:00", "Asia/Kolkata")` → `04:30Z`                              |
| database → form value | `utcToZonedLocal(date, zone)` → `"2026-03-05T10:00"`                                          |
| database → display    | `formatDateTime(date, zone)` (`Intl.DateTimeFormat` with `timeZone`)                          |
| API input             | `parseDateTimeInput`: ISO with offset (`…Z`, `+05:30`) is used as-is; no offset = user's zone |

Built on `Intl` (no date library). Daylight-saving edge cases follow the same "compatible" rule as
JavaScript's Temporal API and are unit-tested:

- **Clocks go back** (a wall time happens twice) → the earlier instant.
- **Clocks go forward** (a wall time doesn't exist) → shifted forward by the gap.

The settings picker lists the runtime's zones with modern names (`Asia/Kolkata`, not the legacy
`Asia/Calcutta`), always includes `UTC`, and offers "use my device's zone" (read in the browser
after hydration via `useSyncExternalStore`, so server and client HTML match).

## Service & API

`src/server/services/interviews.ts` follows the application-service rules: `userId` first, scoped
queries, `NotFoundError` for anything not owned. Creating or moving an interview checks that the
target application belongs to the user (and the composite foreign key would reject it anyway).

| Method               | Path                                                            |
| -------------------- | --------------------------------------------------------------- |
| GET                  | `/api/v1/interviews?view=upcoming\|past\|all&status=&from=&to=` |
| POST                 | `/api/v1/interviews`                                            |
| GET / PATCH / DELETE | `/api/v1/interviews/:id`                                        |

## UI

- `/interviews` — Upcoming (soonest first) / Past (most recent first) tabs, with relative time
  ("in 3 days"), interviewer, location and a "Join" link for scheduled meetings.
- `/interviews/new?applicationId=…` — pre-selects the application when started from its detail page;
  defaults to tomorrow 10:00 in the user's zone.
- `/interviews/:id/edit` — edit, change status (completed, cancelled…), delete with confirmation.
- Upcoming interviews also appear on the dashboard and on each application's page.

Tests: `tests/unit/timezone.test.ts` (conversions, DST, zone list) and
`tests/integration/interview-service.test.ts` (UTC storage, ownership, upcoming/past).
