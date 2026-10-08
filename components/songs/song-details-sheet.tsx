"use client";

import { ReactNode, useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

// Song metadata (title, key, tempo, tags, links) is edited in a drawer, not
// inline: it is contextual, rarely changed, and should not push the song
// flow down the page. Drawer on iPad/desktop, bottom sheet on phones.
export function SongDetailsSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" aria-hidden /> Edit details
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Song details">
        <div className="space-y-5">{children}</div>
      </Sheet>
    </>
  );
}
