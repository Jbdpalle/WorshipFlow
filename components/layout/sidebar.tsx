"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { SIDEBAR_LINKS } from "@/components/layout/nav-links";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils/cn";

export function Sidebar({ userName, teamName }: { userName: string; teamName: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 border-b border-border px-4 py-4 font-semibold"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-sm font-bold">
          W
        </span>
        WorshipFlow
      </Link>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-4">
        {SIDEBAR_LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-accent/15 font-semibold text-accent"
                  : "font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/feedback"
          aria-current={pathname?.startsWith("/feedback") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
            pathname?.startsWith("/feedback")
              ? "bg-accent/15 font-semibold text-accent"
              : "font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
        </Link>
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <Link href="/settings" className="min-w-0 text-xs text-muted-foreground hover:text-foreground">
          <div className="truncate font-medium text-foreground">{userName}</div>
          <div className="truncate">{teamName}</div>
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
