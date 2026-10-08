"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importSongMetadata, type SongMetadataImportSummary } from "@/lib/actions/song-metadata-import";

export function ImportSongMetadataDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SongMetadataImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setError(null);
    setSummary(null);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await importSongMetadata(formData);
    if (!result.ok) {
      setError(result.error);
      setImporting(false);
      return;
    }
    setSummary(result.data);
    router.refresh();
    setImporting(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" /> Import Theme &amp; Verse Data
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Import song metadata"
      >
        {summary ? (
          <div className="space-y-3">
            <p className="text-sm">
              {summary.songsMatched} song{summary.songsMatched === 1 ? "" : "s"} matched and updated.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>{summary.themeCategoriesApplied} theme categories applied</li>
              <li>{summary.tagsApplied} tags added</li>
              <li>{summary.bibleVersesApplied} Bible verses added</li>
              {summary.fieldsSkippedAlreadySet > 0 && (
                <li>{summary.fieldsSkippedAlreadySet} field(s) left as-is because the song already had a value</li>
              )}
            </ul>
            {summary.titlesNotFound.length > 0 && (
              <div className="rounded-lg bg-surface-muted p-2 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">
                  {summary.titlesNotFound.length} title{summary.titlesNotFound.length === 1 ? "" : "s"} not found in your library (name didn&apos;t match exactly):
                </p>
                <p>{summary.titlesNotFound.join(", ")}</p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a spreadsheet (.xlsx/.csv) with a Title column, plus any of Theme Category, Tags,
              Bible Verse / Scripture, Key, BPM, and Time Signature. Matches by exact song title — it
              never overwrites a Key, BPM, or Biblical Connection you&apos;ve already filled in, only fills
              gaps and adds theme categories, tags, and verses.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary"
            >
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">{file ? file.name : "Click to choose a spreadsheet"}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button loading={importing} className="w-full" disabled={!file || importing} onClick={handleImport}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
