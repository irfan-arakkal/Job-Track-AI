import type { DashboardData } from "@/server/services/dashboard";

/**
 * Horizontal bar chart of applications per status. One series, so one colour (--chart-1);
 * the status names are the labels, so identity never depends on colour. Thin bars (≤ 24px)
 * with a rounded data end, value at the tip, a native tooltip on hover, and a visually hidden
 * table for screen readers.
 */
export function StatusBreakdown({ data }: { data: DashboardData["statusBreakdown"] }) {
  const max = Math.max(1, ...data.map((row) => row.count));
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <figure>
      <div aria-hidden className="grid gap-2.5">
        {data.map((row) => {
          const share = total ? Math.round((row.count / total) * 100) : 0;
          return (
            <div
              key={row.status}
              className="group grid grid-cols-[88px_1fr] items-center gap-3"
              title={`${row.label}: ${row.count} (${share}%)`}
            >
              <span className="text-muted-foreground truncate text-sm">{row.label}</span>
              <div className="flex h-5 items-center gap-2">
                {row.count > 0 ? (
                  <div
                    className="bg-chart-1 h-4 rounded-r-[4px] transition-opacity group-hover:opacity-80"
                    style={{ width: `${(row.count / max) * 85}%` }}
                  />
                ) : null}
                <span className="text-sm font-medium tabular-nums">{row.count}</span>
              </div>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Applications by status</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Applications</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.status}>
              <th scope="row">{row.label}</th>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
