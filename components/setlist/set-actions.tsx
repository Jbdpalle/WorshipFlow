"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          loading={busy}
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
          <Button variant="outline" className="text-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete "${setTitle}"?`}
        description="It will be permanently deleted. The setlist, assignments and transitions all go with it. This can't be undone."
        confirmLabel="Delete set"
        onConfirm={async () => {
          const result = await deleteSet(setId);
          if (!result.ok) return result.error;
          router.push("/sets");
          router.refresh();
        }}
      />
    </div>
  );
}
