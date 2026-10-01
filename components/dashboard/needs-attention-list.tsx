import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { NeedsAttentionItem } from "@/lib/dashboard/data";

export function NeedsAttentionList({ items }: { items: NeedsAttentionItem[] }) {
  return (
    <section aria-labelledby="needs-attention-heading" className="rounded-xl border border-border bg-surface p-5">
      <h2 id="needs-attention-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Needs Attention
      </h2>

      {items.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          You&apos;re all set. Nothing needs your attention.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {item.message}
              </span>
              <Link href={item.href} className="shrink-0 text-xs font-medium text-accent hover:underline">
                {item.actionLabel} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
