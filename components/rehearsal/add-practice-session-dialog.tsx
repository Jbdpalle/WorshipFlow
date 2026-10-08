"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPracticeSession } from "@/lib/actions/practice-sessions";

export function AddPracticeSessionDialog({ setId, nextNumber }: { setId: string; nextNumber: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setScheduledAt("");
    setNotes("");
    setError(null);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> Add Practice Session
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="New practice session"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError(null);
            const result = await createPracticeSession(setId, {
              name: name.trim() || `Practice Session ${nextNumber}`,
              scheduledAt: scheduledAt || undefined,
              notes: notes.trim() || undefined,
            });
            setSaving(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
            reset();
            router.refresh();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="practice-name">Practice name</Label>
            <Input
              id="practice-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Practice Session ${nextNumber}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-when">Date &amp; time</Label>
            <Input
              id="practice-when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-notes">Notes (optional)</Label>
            <Textarea
              id="practice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's the focus of this one?"
              rows={2}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button loading={saving} type="submit" className="w-full" disabled={saving}>
            {saving ? "Adding…" : "Add Practice Session"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
