import { ReactNode } from "react";
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
  className,
}: {
  title: ReactNode;
  label?: string;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2;
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
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
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex max-w-full flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
