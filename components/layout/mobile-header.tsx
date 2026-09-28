"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { MOBILE_MORE_LINKS } from "@/components/layout/nav-links";
import { LogoutButton } from "@/components/layout/logout-button";

export function MobileHeader({ userName, teamName }: { userName: string; teamName: string }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-sm font-bold">
          W
        </span>
        WorshipFlow
      </Link>

      <details className="relative">
        <summary className="tap-target flex list-none items-center justify-center rounded-lg px-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </summary>
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{userName}</div>
            <div>{teamName}</div>
          </div>
          {MOBILE_MORE_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="tap-target flex items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          <LogoutButton className="tap-target w-full justify-start px-2" showLabel />
        </div>
      </details>
    </header>
  );
}
