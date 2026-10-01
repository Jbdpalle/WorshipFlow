import Link from "next/link";
import { eventTypeLabel } from "@/lib/songs/constants";
import type { ThisWeekItem } from "@/lib/dashboard/data";

export function ThisWeekList({ items }: { items: ThisWeekItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface-muted p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        This Week
      </h2>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing else on the calendar this week.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <Link href={`/sets/${item.id}`} className="block hover:text-accent">
                <span className="font-medium text-foreground">
                  {item.serviceDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <span className="text-muted-foreground"> — {item.title}</span>
                <span className="block text-xs text-muted-foreground">{eventTypeLabel(item.eventType)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/sets" className="mt-3 inline-block text-xs font-medium text-accent hover:underline">
        View Calendar →
      </Link>
    </section>
  );
}
