"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { Logo } from "@/components/brand/logo";

// Failure on a public page (landing, login, invite).
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <Logo />
      <ErrorState onRetry={retry} homeHref="/" reference={error.digest} />
    </main>
  );
}
