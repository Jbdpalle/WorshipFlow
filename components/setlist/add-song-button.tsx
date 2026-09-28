"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addSongToSet } from "@/lib/actions/sets";

export function AddSongButton({ setId, songId }: { setId: string; songId: string }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant={added ? "secondary" : "outline"}
        disabled={loading || added}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await addSongToSet(setId, songId);
            setAdded(true);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to add.");
          } finally {
            setLoading(false);
          }
        }}
      >
        {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {added ? "Added" : "Add"}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
