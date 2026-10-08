import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "default"
  | "primary"
  | "musical"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  /** @deprecated legacy name for "primary" */
  | "accent";

const variantClasses: Record<Variant, string> = {
  default: "bg-surface-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-primary text-primary-foreground",
  musical: "bg-musical-soft text-musical",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  outline: "border border-border text-foreground",
};

// A label. For state ("Confirmed", "Drums open") use <Status>, which always
// pairs colour with an icon so meaning never depends on colour alone.
export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
