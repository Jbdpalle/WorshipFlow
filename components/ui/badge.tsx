import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "default" | "accent" | "success" | "danger" | "outline";

const variantClasses: Record<Variant, string> = {
  default: "bg-surface-muted text-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  outline: "border border-border text-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
