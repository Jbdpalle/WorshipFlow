import Link from "next/link";
import { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

// primary = the one important action on a screen. Everything else should be
// outline/secondary/ghost so the primary action stays obvious.
const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-surface-muted text-foreground hover:bg-border",
  outline: "border border-border bg-transparent text-foreground hover:bg-surface-muted",
  ghost: "bg-transparent text-foreground hover:bg-surface-muted",
  danger: "bg-danger text-danger-foreground hover:opacity-90",
};

// md and lg meet the 44px touch target; sm (36px) is for dense desktop rows.
const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-md [@media(pointer:coarse)]:h-11",
  md: "h-11 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg",
  icon: "h-11 w-11 rounded-lg",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

// A link that looks like a button. Use this instead of wrapping a <Button>
// in a <Link>: that nests two interactive elements, gives keyboard users two
// tab stops, and confuses screen readers. One element, one action.
export const ButtonLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof Link> & { variant?: Variant; size?: Size } & AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <Link ref={ref} className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)} {...props} />
));
ButtonLink.displayName = "ButtonLink";
