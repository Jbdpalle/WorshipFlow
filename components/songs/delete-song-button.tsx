"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteSong } from "@/lib/actions/songs";

export function DeleteSongButton({ songId, songTitle }: { songId: string; songTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden /> Delete song
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete "${songTitle}"?`}
        description="This removes its arrangement, notes and rehearsal history too. It can't be undone. The song is also removed from any set it is in."
        confirmLabel="Delete song"
        onConfirm={async () => {
          const result = await deleteSong(songId);
          if (!result.ok) return result.error;
          router.push("/songs");
          router.refresh();
        }}
      />
    </>
  );
}
