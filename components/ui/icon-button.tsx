import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

// An icon-only control. `label` is required (it becomes aria-label and the
// native tooltip) so no icon button can ship without an accessible name.
// 44×44 touch target.
export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  tone?: "default" | "danger";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, tone = "default", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-50",
        tone === "danger"
          ? "text-danger hover:bg-danger/15"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
