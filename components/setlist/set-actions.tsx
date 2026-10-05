"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveSet, unarchiveSet, deleteSet } from "@/lib/actions/sets";

export function SetActions({
  setId,
  setTitle,
  isArchived,
  isLeader,
}: {
  setId: string;
  setTitle: string;
  isArchived: boolean;
  isLeader: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = isArchived ? await unarchiveSet(setId) : await archiveSet(setId);
            setBusy(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          }}
        >
          {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {isArchived ? "Unarchive" : "Archive"}
        </Button>
        {isLeader && isArchived && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete "${setTitle}"? It will be permanently deleted — the setlist, assignments, and transitions all go with it. This can't be undone.`,
                )
              ) {
                return;
              }
              setBusy(true);
              setError(null);
              const result = await deleteSet(setId);
              setBusy(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push("/sets");
              router.refresh();
            }}
          >
            <Trash2 className="h-4 w-4 text-danger" />
            Delete
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
