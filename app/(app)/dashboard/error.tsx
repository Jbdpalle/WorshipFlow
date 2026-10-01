"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden />
      <p className="text-sm text-muted-foreground">We couldn&apos;t load your worship schedule.</p>
      <Button onClick={() => reset()}>Try Again</Button>
    </div>
  );
}
