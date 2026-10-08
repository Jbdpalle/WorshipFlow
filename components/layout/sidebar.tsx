"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { NAV_GROUPS, SETTINGS_LINK, isActive } from "@/components/layout/nav-links";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";

// iPad portrait / small laptop (md–lg): a 64px icon rail.
// iPad landscape and up (lg+): full 256px sidebar with labels.
// Same links, same order, same active treatment — only the width changes.
export function Sidebar({ userName, teamName }: { userName: string; teamName: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-border bg-surface md:flex lg:w-64">
      <Link
        href="/dashboard"
        aria-label="WorshipFlow home"
        className="flex h-16 items-center justify-center border-b border-border lg:justify-start lg:px-4"
      >
        <span className="lg:hidden"><Logo showWordmark={false} /></span>
        <span className="hidden lg:inline"><Logo /></span>
      </Link>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-4 lg:px-3">
        {NAV_GROUPS.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <div className="mx-2 my-3 border-t border-border" role="separator" />}
            <ul className="space-y-1">
              {group.map((link) => {
                const Icon = link.icon;
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={link.label}
                      title={link.label}
                      className={cn(
                        "flex h-11 items-center justify-center gap-3 rounded-lg text-sm transition-colors duration-[var(--duration-fast)] lg:justify-start lg:px-3",
                        active
                          ? "bg-surface-muted font-semibold text-primary"
                          : "font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="hidden lg:inline">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Fragment>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1 border-t border-border px-2 py-3 lg:flex-row lg:justify-between lg:px-4">
        <Link
          href={SETTINGS_LINK.href}
          aria-label={`Settings — ${userName}, ${teamName}`}
          title="Settings"
          className="flex min-w-0 items-center gap-2.5 rounded-lg hover:bg-surface-muted lg:p-1"
        >
          <Avatar name={userName} size="md" />
          <span className="hidden min-w-0 text-xs text-muted-foreground lg:block">
            <span className="block truncate font-semibold text-foreground">{userName}</span>
            <span className="block truncate">{teamName}</span>
          </span>
        </Link>
        <div className="flex shrink-0 flex-col items-center gap-0.5 lg:flex-row">
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
