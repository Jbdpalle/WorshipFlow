"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteChurch } from "@/lib/actions/church";

export function DangerZone({ churchName }: { churchName: string }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const matches = confirmText === churchName;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This deletes every set, song, team member, and rehearsal under <strong>{churchName}</strong>. There
        is no undo.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-church-name">
          Type <strong>{churchName}</strong> to confirm
        </Label>
        <Input
          id="confirm-church-name"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={churchName}
        />
      </div>
      <Button
        variant="danger"
        className="h-auto min-h-11 w-full whitespace-normal py-2 sm:w-auto"
        disabled={!matches}
        onClick={() => setOpen(true)}
      >
        Delete {churchName} permanently
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Permanently delete ${churchName}?`}
        description="Every set, song, team member and rehearsal goes with it. This cannot be undone."
        confirmLabel="Yes, delete everything"
        onConfirm={async () => {
          const result = await deleteChurch(confirmText);
          if (!result.ok) return result.error;
          router.push("/login");
        }}
      />
    </div>
  );
}
