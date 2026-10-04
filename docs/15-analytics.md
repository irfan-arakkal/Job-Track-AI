# 15 — Analytics (Phase 12)

`/analytics?range=3m|6m|12m|all` — the range lives in the URL (shareable, back button works) and
sits in one row above the charts.

## Metrics and how they're defined

| Metric                         | Definition                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Applications                   | applications **sent** (applied date in the range; wishlist excluded)                                                                           |
| Response rate                  | sent applications that ever moved to Screening, Interview, Offer, Accepted or Rejected                                                         |
| Interview rate                 | … that ever reached Interview (or beyond)                                                                                                      |
| Offer rate                     | … that ever reached Offer or Accepted                                                                                                          |
| Rejection rate                 | currently Rejected                                                                                                                             |
| Average / median response time | days from applied date to the **first** status change that counts as a response; applications with no response are excluded (not counted as 0) |
| Per month                      | sent applications grouped by applied month, **including empty months**                                                                         |
| By company / location          | top 8, the rest folded into "Other"; missing location → "Not specified"                                                                        |

Rates use the **status history** (`status_changes`), not just the current status, so an
application that reached an interview and was later rejected still counts as an interview.

## Code

- `src/lib/analytics.ts` — pure helpers (`monthSeries`, `responseDays`, `average`, `median`,
  `topWithOther`), unit-tested.
- `src/server/services/analytics.ts` — `getAnalytics(userId, range)`: user-scoped queries + the
  helpers. Counts and rates reuse `getStatistics` from the insights service (also used by the AI
  assistant and MCP), so every surface reports the same numbers.
- `src/features/analytics/components` — Recharts charts and an accessible data table.

## Chart design

Built following a data-viz method rather than taste:

- **Right form for each job:** single numbers are stat tiles (no chart needed); change over time is
  a column chart; ranked categories are horizontal bars.
- **One series per chart → one colour** (`--chart-1`, validated light/dark palette steps) and no
  legend; the card title names the series.
- Thin bars (≤ 24px) with a 4px rounded data end, recessive grid/axes, values labelled in text
  colour (never the bar colour), hover tooltips on every bar.
- **Accessible:** every chart has a "Show data table" disclosure with the same numbers; dark mode
  uses its own colour steps; labels truncate instead of overflowing on phones.

Tests: `tests/unit/analytics.test.ts`, `tests/integration/analytics.test.ts` (months with gaps,
breakdowns, response time, other users excluded, range cut-off).
