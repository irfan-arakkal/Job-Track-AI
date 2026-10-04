"use client";

import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes, type AppRouteHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

const icons: Record<AppRouteHref, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/applications": BriefcaseBusiness,
  "/interviews": CalendarClock,
  "/resumes": FileText,
  "/analytics": BarChart3,
  "/assistant": Bot,
  "/settings": Settings,
};

/** The list of section links. Used in the desktop sidebar and inside the mobile menu. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="grid gap-1">
      {appRoutes.map(({ href, label }) => {
        const Icon = icons[href];
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
