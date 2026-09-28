"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TAB_LINKS } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {MOBILE_TAB_LINKS.map((link) => {
        const Icon = link.icon;
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium",
              active ? "text-accent" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
