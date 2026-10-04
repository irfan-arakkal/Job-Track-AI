/**
 * The app's main sections. Used by the sidebar (labels, order) and by the proxy (which paths
 * need a signed-in user). Kept free of React/icon imports so the proxy stays lightweight.
 */
export const appRoutes = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/interviews", label: "Interviews" },
  { href: "/resumes", label: "Resumes" },
  { href: "/analytics", label: "Analytics" },
  { href: "/assistant", label: "AI Assistant" },
  { href: "/settings", label: "Settings" },
] as const;

export type AppRouteHref = (typeof appRoutes)[number]["href"];

/** True for "/dashboard", "/applications/123", etc. — but not "/dashboards" or "/". */
export function isProtectedPath(pathname: string) {
  return appRoutes.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
}
