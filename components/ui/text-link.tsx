import Link from "next/link";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

// An inline action link ("Edit roster →"). 44px tall hit area, primary
// colour, underline on hover. Use instead of hand-styled <Link>s.
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline",
        className,
      )}
      {...props}
    />
  );
}
