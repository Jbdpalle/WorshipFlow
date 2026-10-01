"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSong } from "@/lib/actions/songs";

export function DeleteSongButton({ songId, songTitle }: { songId: string; songTitle: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${songTitle}"? This removes its arrangement, notes, and rehearsal history too — it can't be undone.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    const result = await deleteSong(songId);
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push("/songs");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
        <Trash2 className="h-4 w-4 text-danger" />
        {deleting ? "Deleting…" : "Delete"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
