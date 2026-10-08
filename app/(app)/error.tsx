"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

// Catches an unexpected failure in any signed-in page and keeps the shell
// (sidebar, navigation) on screen so the person can retry or move on.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState onRetry={retry} reference={error.digest} />;
}
