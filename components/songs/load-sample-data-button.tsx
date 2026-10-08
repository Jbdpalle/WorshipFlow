"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSampleData } from "@/lib/actions/sample-data";

// The one shared trigger for lib/actions/sample-data.ts's loadSampleData,
// used from every empty state a brand-new leader might land on first
// (Dashboard, Sets, Library) — not just the one it was originally built
// for, so "explore a sample set" is an obvious choice wherever someone
// starts, not a feature only discoverable from the Library page.
export function LoadSampleDataButton({
  variant = "outline",
  // The Library page's own empty state wants to stay put and show the new
  // sample songs right there; Dashboard/Sets want to land on /sets, since
  // that's where the new sample set itself actually shows up.
  redirectToSets = true,
}: {
  variant?: "primary" | "outline";
  redirectToSets?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button type="button" variant={variant} loading={loading} onClick={async () => {
        setLoading(true);
        setError(null);
        const result = await loadSampleData();
        setLoading(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (redirectToSets) router.push("/sets");
        router.refresh();
      }}>
        <Sparkles className="h-4 w-4" aria-hidden /> {loading ? "Loading sample set…" : "Explore a sample set"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
