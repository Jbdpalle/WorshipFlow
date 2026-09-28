"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importSongFromPdf } from "@/lib/actions/import";

export function ImportPdfDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await importSongFromPdf(formData);
    if (!result.ok) {
      setError(result.error);
      setImporting(false);
      return;
    }
    setOpen(false);
    router.push(`/songs/${result.data.id}`);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" /> Import from PDF
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setFile(null);
          setError(null);
        }}
        title="Import a chord chart PDF"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Works with text-based chord charts (e.g. exported from SongBook Pro). We pull out the
            title, artist, key, and section structure — you can review and edit everything after
            import. For your team&apos;s internal use only; make sure your CCLI license covers
            reproducing this content.
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-accent"
          >
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm">
              {file ? file.name : "Click to choose a PDF file"}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button className="w-full" disabled={!file || importing} onClick={handleImport}>
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
