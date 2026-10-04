import { BriefcaseBusiness, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { ApplicationFilters } from "@/features/applications/components/application-filters";
import { ApplicationsTable } from "@/features/applications/components/applications-table";
import { applicationListQuerySchema } from "@/features/applications/schemas";
import { listApplications } from "@/server/services/applications";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  const user = await requireUser();
  const raw = await searchParams;
  // Bad or tampered query params fall back to defaults instead of erroring.
  const query = applicationListQuerySchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );
  const result = await listApplications(user.id, query);
  const isFiltered = Boolean(query.q || query.status);

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    if (query.sort !== "updated") params.set("sort", query.sort);
    params.set("page", String(page));
    return `/applications?${params}`;
  };

  const newButton = (
    <Button asChild>
      <Link href="/applications/new">
        <Plus /> New application
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every job you're tracking, from wishlist to offer."
        actions={newButton}
      />
      {result.total === 0 && !isFiltered ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No applications yet"
          description="Add the first job you're interested in — even before you apply, using the Wishlist status."
          action={newButton}
        />
      ) : (
        <>
          <ApplicationFilters />
          {result.total === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching applications"
              description="Try a different search term or status filter."
              action={
                <Button asChild variant="outline">
                  <Link href="/applications">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ApplicationsTable items={result.items} />
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                hrefForPage={hrefForPage}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
