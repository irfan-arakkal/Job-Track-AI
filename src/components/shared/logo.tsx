import { BriefcaseBusiness } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <BriefcaseBusiness className="size-4" aria-hidden />
      </span>
      {siteConfig.name}
    </Link>
  );
}
