import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Inline loading: a small spinner with a text label (or a screen-reader-only
// one). Use for "this part is working" next to content; use Skeleton for the
// shape of content that is still on its way, and Button `loading` for an
// action in flight.
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}
