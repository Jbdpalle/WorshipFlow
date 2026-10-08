import Link from "next/link";

// Phone top bar: brand and team only. All navigation lives in the bottom
// bar (and its More sheet) so there is exactly one place to go next.
export function MobileHeader({ teamName }: { teamName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          W
        </span>
        WorshipFlow
      </Link>
      <span className="min-w-0 truncate text-sm text-muted-foreground">{teamName}</span>
    </header>
  );
}
