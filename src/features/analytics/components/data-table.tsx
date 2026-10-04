/** "Show data" disclosure under each chart: the same numbers as an accessible table. */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: [string, string];
  rows: [string, number | string][];
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
        Show data table
      </summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th scope="col" className="py-1 font-medium">
              {columns[0]}
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              {columns[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b last:border-0">
              <th scope="row" className="py-1 text-left font-normal">
                {label}
              </th>
              <td className="py-1 text-right tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
