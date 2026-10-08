import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SaveState = "idle" | "saving" | "saved" | "error";

// A small shared "did that actually save?" indicator — every auto-saving
// field in the app uses this, paired with an explicit Save button, so a
// click away is never the only evidence a change persisted.
export function SaveStatus({
  state,
  errorMessage,
  className,
}: {
  state: SaveState;
  errorMessage?: string;
  className?: string;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span role="status" className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span role="alert" className={cn("text-xs text-danger", className)}>
        {errorMessage ?? "Couldn't save — try again"}
      </span>
    );
  }
  return (
    <span role="status" className={cn("flex items-center gap-1 text-xs text-success", className)}>
      <Check className="h-3 w-3" /> Saved
    </span>
  );
}
