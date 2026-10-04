import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import type { ApplicationListItem } from "@/server/services/applications";

/** Table on wide screens, stacked cards on phones — same data, layout suited to each. */
export function ApplicationsTable({ items }: { items: ApplicationListItem[] }) {
  return (
    <>
      <div className="bg-card hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Company
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Location
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Applied
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((application) => (
              <tr key={application.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/applications/${application.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {application.jobTitle}
                  </Link>
                </td>
                <td className="px-4 py-3">{application.company.name}</td>
                <td className="text-muted-foreground px-4 py-3">{application.location ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={application.status} />
                </td>
                <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                  {formatDate(application.appliedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {items.map((application) => (
          <li key={application.id}>
            <Link
              href={`/applications/${application.id}`}
              className="bg-card hover:bg-muted/40 block rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{application.jobTitle}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {application.company.name}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {application.location ?? "No location"} · Applied{" "}
                {formatDate(application.appliedAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
