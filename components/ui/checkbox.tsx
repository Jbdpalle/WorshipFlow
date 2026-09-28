import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-5 w-5 rounded border-border text-accent focus:ring-accent focus:ring-2",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";
