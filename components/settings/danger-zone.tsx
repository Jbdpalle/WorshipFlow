"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deleteChurch } from "@/lib/actions/church";

export function DangerZone({ churchName }: { churchName: string }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmText === churchName;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This deletes every set, song, team member, and rehearsal under <strong>{churchName}</strong>. There
        is no undo.
      </p>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Type <strong>{churchName}</strong> to confirm
        </label>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={churchName}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        variant="danger"
        disabled={!matches || busy}
        onClick={async () => {
          if (!confirm(`Permanently delete ${churchName}? This cannot be undone.`)) return;
          setBusy(true);
          setError(null);
          const result = await deleteChurch(confirmText);
          if (!result.ok) {
            setBusy(false);
            setError(result.error);
            return;
          }
          router.push("/login");
        }}
      >
        {busy ? "Deleting…" : `Delete ${churchName} permanently`}
      </Button>
    </div>
  );
}
