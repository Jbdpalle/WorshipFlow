"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListMusic,
  Library,
  Users,
  UserCircle,
  Timer,
  MessageSquarePlus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: ListMusic },
  { href: "/songs", label: "Library", icon: Library },
  { href: "/team", label: "Team", icon: Users },
  { href: "/my-part", label: "My Part", icon: UserCircle },
  { href: "/metronome", label: "Metronome", icon: Timer },
];

export function Nav({ userName, teamName }: { userName: string; teamName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6 overflow-x-auto">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-sm font-bold">
              W
            </span>
            <span className="hidden sm:inline">WorshipFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const Icon = link.icon;
              const active = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/feedback"
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            title="Send feedback"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden lg:inline">Feedback</span>
          </Link>
          <div className="hidden sm:block text-right text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{userName}</div>
            <div>{teamName}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
