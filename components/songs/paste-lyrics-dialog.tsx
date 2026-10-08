"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importSongFromText } from "@/lib/actions/import";

export function PasteLyricsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setText("");
    setError(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const result = await importSongFromText(text);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setOpen(false);
    reset();
    router.push(`/songs/${result.data.id}`);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <ClipboardPaste className="h-4 w-4" /> Paste Lyrics
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Paste lyrics or a chord chart"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste plain lyrics, or a full chord chart (title and artist on the first two lines,
            then section labels like Verse 1 / Chorus / Bridge) — we&apos;ll split it into
            sections the same way PDF import does. Plain lyrics with no section labels land as
            one &quot;Full Song&quot; section; everything is editable after.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="font-mono text-sm"
            placeholder={"Amazing Grace\nJohn Newton\nKey: G\n\nVerse 1\nG         G7           C       G\nAmazing grace how sweet the sound…"}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button loading={saving} className="w-full" disabled={!text.trim() || saving} onClick={handleSubmit}>
            {saving ? "Adding…" : "Add to library"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
