"use client";

import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// Errors are clear, human and actionable: what happened, what it means for
// the person, and what to do next. Never a stack trace or "mutation failed".
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this page. Your changes are safe. Try again, or head back to the dashboard.",
  onRetry,
  homeHref = "/dashboard",
  reference,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  homeHref?: string | null;
  /** Short support reference (e.g. the error digest). */
  reference?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden />
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        {homeHref && (
          <ButtonLink href={homeHref} variant="outline">Go to dashboard</ButtonLink>
        )}
      </div>
      {reference && <p className="tnum text-xs text-muted-foreground">Reference: {reference}</p>}
    </div>
  );
}
