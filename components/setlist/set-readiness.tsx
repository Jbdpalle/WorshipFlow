import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ReadinessItem } from "@/lib/songs/readiness";

export function SetReadiness({ items }: { items: ReadinessItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> Ready
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-accent/10 px-3 py-2">
      <p className="flex items-center gap-2 text-sm font-medium text-accent">
        <AlertCircle className="h-4 w-4" aria-hidden />
        Needs attention — {items.length} thing{items.length === 1 ? "" : "s"} to complete
      </p>
      <ul className="mt-1.5 space-y-0.5 pl-6 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.id} className="list-disc">
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
