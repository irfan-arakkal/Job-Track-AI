"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { applicationSortOptions, applicationStatuses } from "@/lib/applications";
import { cn } from "@/lib/utils";

/**
 * Search, status filter and sort. State lives in the URL (?q=&status=&sort=), so filtered views
 * can be bookmarked and shared, the back button works, and the server renders the results.
 */
export function ApplicationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // a new filter starts again at page 1
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  // Debounce typing: only search 300 ms after the user stops typing.
  useEffect(() => {
    if (query === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => update("q", query.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      className={cn("mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]", isPending && "opacity-70")}
      aria-busy={isPending}
    >
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, company or location"
          aria-label="Search applications"
          className="pl-9"
        />
      </div>
      <NativeSelect
        aria-label="Filter by status"
        value={searchParams.get("status") ?? ""}
        onChange={(event) => update("status", event.target.value)}
      >
        <option value="">All statuses</option>
        {applicationStatuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Sort by"
        value={searchParams.get("sort") ?? "updated"}
        onChange={(event) => update("sort", event.target.value)}
      >
        {applicationSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
