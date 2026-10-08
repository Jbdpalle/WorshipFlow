"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  MOBILE_MORE_LINKS,
  MOBILE_TAB_LINKS,
  isActive,
} from "@/components/layout/nav-links";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

const itemClasses =
  "tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold transition-colors duration-[var(--duration-fast)]";

// Phone navigation: four destinations and a More button that opens a bottom
// sheet. Hidden from iPad portrait up, where the sidebar rail takes over.
export function BottomNav({ userName, teamName }: { userName: string; teamName: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE_LINKS.some((l) => isActive(pathname, l.href));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_TAB_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(itemClasses, active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(itemClasses, moreActive ? "text-primary" : "text-muted-foreground")}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={moreActive ? 2.5 : 2} aria-hidden />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="mb-3 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">{userName}</div>
          <div>{teamName}</div>
        </div>
        <ul className="space-y-1">
          {MOBILE_MORE_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap-target flex items-center gap-3 rounded-lg px-3 text-base font-medium",
                    active
                      ? "bg-surface-muted font-semibold text-primary"
                      : "text-foreground hover:bg-surface-muted",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          <ThemeToggleButton className="w-full justify-start px-3 text-base" showLabel />
          <LogoutButton className="tap-target w-full justify-start px-3 text-base" showLabel />
        </div>
      </Sheet>
    </>
  );
}
