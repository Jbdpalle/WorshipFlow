import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { StageIcon, type Stage } from "@/components/ui/stage-icon";
import { cn } from "@/lib/utils/cn";

// Never "no data". Say what is missing, why it matters, and what to do next.
// Keep it to a title, one sentence, and one action.
export function EmptyState({
  icon: Icon,
  stage,
  title,
  description,
  action,
  className,
  as: Heading = "h2",
}: {
  icon?: LucideIcon;
  /** Colours the icon by workflow stage; omit for a neutral icon. */
  stage?: Stage;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Heading level; use h1 when this is the whole page (not found). */
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      {Icon &&
        (stage ? (
          <StageIcon icon={Icon} stage={stage} size="lg" />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
        ))}
      <Heading className="text-lg font-semibold text-foreground">{title}</Heading>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
