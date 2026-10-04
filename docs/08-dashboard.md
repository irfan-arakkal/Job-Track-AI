# 08 — Dashboard (Phase 5)

`src/server/services/dashboard.ts` → `getDashboardData(userId)` runs seven user-scoped queries
**in parallel** (`Promise.all`) and lets PostgreSQL do the counting (`COUNT`, `GROUP BY status`)
instead of loading every row into JavaScript.

| Tile / section      | Definition                                                                    |
| ------------------- | ----------------------------------------------------------------------------- |
| Applications        | all tracked applications (including wishlist)                                 |
| This month          | `appliedAt` on or after the 1st of the current month (UTC)                    |
| Interviews          | all interview records; hint shows upcoming (`SCHEDULED`, in the future)       |
| Offers              | status `OFFER` + `ACCEPTED`                                                   |
| Rejections          | status `REJECTED`                                                             |
| Pipeline            | count per status, always all seven statuses in pipeline order (stable layout) |
| Upcoming interviews | next 5 scheduled, shown in the user's time zone                               |
| Recent applications | 5 most recently updated                                                       |

## Chart choices

The pipeline is **one series** (count per status), so it uses a single colour (`--chart-1`, a
validated data-viz palette step with separate light/dark values) and status names as labels —
meaning never depends on colour. Bars are thin with a rounded data end, the value sits at the
tip, each row has a hover tooltip, and a visually hidden `<table>` gives screen readers the same
data. KPI numbers are shown as plain stat tiles: a single number doesn't need a chart.

## States

- **Loading:** shared skeleton (`(app)/loading.tsx`).
- **Empty:** a brand-new user sees a welcome card with "New application" instead of zeros.
- **Error:** `(app)/error.tsx` with a retry button.
- **Responsive:** tiles 2-up on phones, 5-up on desktop; the grid uses `minmax(0, 1fr)` so long
  titles truncate instead of widening the page.

Tests: `tests/integration/dashboard.test.ts` (zero state; counts by status/month/upcoming that
ignore other users' data).
