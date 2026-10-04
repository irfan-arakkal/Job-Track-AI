# 14 — Follow-up Reminders (Phase 11)

## Rules (`src/lib/reminders.ts` — a pure function)

| Type                 | When                                                              | Dedupe key                           |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `NO_RESPONSE`        | status still **Applied** 7+ days after the applied date           | `no_response:<app>:<appliedDate>`    |
| `FOLLOW_UP`          | the user's follow-up date is today or past (active statuses only) | `follow_up:<app>:<followUpDate>`     |
| `INTERVIEW_TODAY`    | a scheduled interview later **today** in the user's time zone     | `interview_today:<id>:<startUtc>`    |
| `INTERVIEW_TOMORROW` | a scheduled interview **tomorrow** in the user's time zone        | `interview_tomorrow:<id>:<startUtc>` |

`computeReminders({ applications, interviews, now, timeZone })` has no database access and takes
`now` as input, so every rule is unit-tested with fixed dates — including "an interview at 20:00
UTC is _tomorrow_ for a user in India".

## Sync (`src/server/services/reminders.ts`)

`syncRemindersForUser(userId)` loads the user's relevant data, computes candidates and in one
transaction:

1. **creates** them with `createMany({ skipDuplicates: true })` — the unique `dedupeKey` makes
   this **idempotent** (run it 100 times, get each reminder once; dismissed ones stay dismissed);
2. **resolves** pending reminders that no longer apply (the company replied, the interview was
   cancelled) by marking them `DONE`.

Because the key includes the date that triggered it, changing an applied date or rescheduling an
interview produces a fresh reminder.

## When it runs

- **On every dashboard visit** (cheap, per user) — reminders work with no scheduler at all.
- **Daily job:** `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` syncs all users in
  batches of 100; one user's failure is logged and doesn't stop the rest. The secret is compared in
  constant time. Schedule it with Vercel Cron (Phase 15), GitHub Actions or system cron, e.g.
  `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/reminders`.

## UI & API

- Dashboard **Reminders** card with _Done_ / _Dismiss_ (optimistic removal), linking to the
  application or interview. A **bell** in the header shows the pending count.
- `GET /api/v1/reminders?status=PENDING|DONE|DISMISSED`, `PATCH /api/v1/reminders/:id { status }`.

## Email (next step)

`Reminder.notifiedAt` is already in the schema. Adding email means: in the daily job, select
`PENDING` reminders with `notifiedAt IS NULL`, send one digest per user through a provider (e.g.
Resend/Postmark) behind a small `Notifier` interface, then set `notifiedAt`. The rules and
idempotency above don't change.

Tests: `tests/unit/reminders.test.ts` (each rule, time zones, ordering) and
`tests/integration/reminders.test.ts` (idempotency, auto-resolve, dismissed stays dismissed,
interview reminders, ownership, the all-users job).
