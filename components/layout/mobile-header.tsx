import Link from "next/link";
import { Logo } from "@/components/brand/logo";

// Phone top bar: brand and team only. All navigation lives in the bottom
// bar (and its More sheet) so there is exactly one place to go next.
export function MobileHeader({ teamName }: { teamName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:hidden">
      <Link href="/dashboard" aria-label="WorshipFlow home">
        <Logo />
      </Link>
      <span className="min-w-0 truncate text-sm text-muted-foreground">{teamName}</span>
    </header>
  );
}
