import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/shared/logo";

type AppShellProps = {
  user: { name: string; email: string };
  children: ReactNode;
};

/** The frame around every signed-in page: sidebar on desktop, top bar with menu on mobile. */
export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="bg-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r p-4 lg:flex">
        <Logo href="/dashboard" className="px-1" />
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-4 backdrop-blur sm:px-6">
          <MobileNav />
          <Logo href="/dashboard" className="lg:hidden" />
          <div className="ml-auto">
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
