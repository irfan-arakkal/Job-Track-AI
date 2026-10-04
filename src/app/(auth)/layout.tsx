import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { getCurrentUser } from "@/server/session";

/** Shared layout for /login and /register. Signed-in users are sent to their dashboard. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // A real (database) session check, unlike the proxy's cookie check — so a stale cookie
  // can't cause a redirect loop here.
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-muted/40 flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Logo />
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
