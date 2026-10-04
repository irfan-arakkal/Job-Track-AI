import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/session";

/**
 * Layout for every signed-in page. `requireUser()` does the real session check (database
 * lookup) and redirects to /login if there is no valid session.
 *
 * Note: a layout check alone isn't enough for *data* — pages, Server Actions and API routes
 * call `requireUser()` / `getCurrentUser()` again before reading anything, because layouts
 * don't re-run on every navigation. React's `cache` makes the repeat call free.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
