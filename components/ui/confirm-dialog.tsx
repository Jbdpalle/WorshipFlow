"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// A focused yes/no for a consequential action (delete, revoke). Used
// instead of the browser's built-in popup, which cannot be styled, themed,
// labelled or tested. `onConfirm` returns an error message to show in the dialog, or
// nothing on success (the dialog then closes). While it runs the confirm
// button shows a spinner and both buttons are disabled.
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<string | null | void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title={title}>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">{description}</div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const message = await onConfirm();
              setBusy(false);
              if (message) {
                setError(message);
                return;
              }
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
