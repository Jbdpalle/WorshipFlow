import { ReactNode } from "react";
import { AlertTriangle, Check, Clock, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

const tones: Record<StatusTone, { classes: string; icon: typeof Check }> = {
  success: { classes: "bg-success/15 text-success", icon: Check },
  warning: { classes: "bg-warning/15 text-warning", icon: AlertTriangle },
  danger: { classes: "bg-danger/15 text-danger", icon: OctagonAlert },
  info: { classes: "bg-info/15 text-info", icon: Info },
  muted: { classes: "bg-surface-muted text-muted-foreground", icon: Clock },
};

// State is always icon + word + colour, never colour alone (works in glare
// and for colour-blind users). Pass `children` as the word.
export function Status({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  const { classes, icon: Icon } = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        classes,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}
