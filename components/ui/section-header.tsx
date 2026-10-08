import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { StageIcon, type Stage } from "@/components/ui/stage-icon";
import { cn } from "@/lib/utils/cn";

// The one heading pattern for a screen or a section: optional caps label
// above, title, optional description, optional action on the right.
// level 1 = page title, 2 = section.
export function SectionHeader({
  title,
  label,
  description,
  action,
  level = 2,
  icon,
  stage,
  className,
}: {
  title: ReactNode;
  label?: string;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2;
  /** Optional stage-coloured tile beside the title (page headers). */
  icon?: LucideIcon;
  stage?: Stage;
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && stage && (
          <StageIcon
            icon={icon}
            stage={stage}
            size={level === 1 ? "lg" : "md"}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 space-y-1">
          {label && <p className="label-caps">{label}</p>}
          <Heading
            className={cn(
              "font-bold tracking-tight text-foreground",
              level === 1 ? "text-3xl" : "text-xl",
            )}
          >
            {title}
          </Heading>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
