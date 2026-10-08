"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, X, CircleCheck, CircleAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importSongsFromPdfs, type PdfImportSummary } from "@/lib/actions/import";

// A defensive backstop on top of the server-side per-file timeout: if a
// batch request hangs for any reason at all (server, network, hosting
// infra), the UI still stops spinning and lets the user retry instead of
// waiting forever with no feedback.
const CLIENT_BATCH_TIMEOUT_MS = 60_000;

function withClientTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("That took too long and may still be running on the server — try again in a moment.")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Server Actions have a request body limit (a real bulk import — dozens of
// chord charts in one request — can exceed it, and hosting platforms
// impose their own caps too), so a large selection is sent as several
// smaller requests instead of one, batched by total size rather than file
// count since chord-chart PDFs vary a lot in size.
const BATCH_BYTE_LIMIT = 3 * 1024 * 1024;

function batchFilesBySize(files: File[]): File[][] {
  const batches: File[][] = [];
  let current: File[] = [];
  let currentSize = 0;
  for (const file of files) {
    if (current.length > 0 && currentSize + file.size > BATCH_BYTE_LIMIT) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(file);
    currentSize += file.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export function ImportPdfDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PdfImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFiles([]);
    setError(null);
    setSummary(null);
  }

  function addFiles(newFiles: File[]) {
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleImport() {
    if (files.length === 0) return;
    setImporting(true);
    setError(null);

    const batches = batchFilesBySize(files);
    const combined: PdfImportSummary = { imported: [], failed: [] };

    for (let i = 0; i < batches.length; i++) {
      setProgress({ done: i, total: batches.length });
      const formData = new FormData();
      for (const file of batches[i]) formData.append("file", file);
      try {
        const result = await withClientTimeout(importSongsFromPdfs(formData), CLIENT_BATCH_TIMEOUT_MS);
        if (result.ok) {
          combined.imported.push(...result.data.imported);
          combined.failed.push(...result.data.failed);
        } else {
          // A whole batch can fail before reaching per-file handling (e.g. a
          // request-level error) — record every file in it as failed rather
          // than losing the batch silently, and keep going with the rest.
          combined.failed.push(...batches[i].map((f) => ({ filename: f.name, error: result.error })));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong with this batch.";
        combined.failed.push(...batches[i].map((f) => ({ filename: f.name, error: message })));
      }
    }

    setImporting(false);
    setProgress(null);

    // A clean single-file import keeps the original UX: go straight to the song.
    if (combined.imported.length === 1 && combined.failed.length === 0) {
      setOpen(false);
      router.push(`/songs/${combined.imported[0].id}`);
      return;
    }
    setSummary(combined);
    router.refresh();
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
          reset();
        }}
        title="Import chord chart PDFs"
      >
        {summary ? (
          <div className="space-y-3">
            {summary.imported.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  {summary.imported.length} song{summary.imported.length === 1 ? "" : "s"} imported
                </p>
                {summary.imported.map((s) => (
                  <Link
                    key={s.id}
                    href={`/songs/${s.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-1.5 text-sm hover:bg-surface-muted/70"
                  >
                    <CircleCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                    {s.title}
                  </Link>
                ))}
              </div>
            )}
            {summary.failed.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-danger">
                  {summary.failed.length} file{summary.failed.length === 1 ? "" : "s"} couldn&apos;t be imported
                </p>
                {summary.failed.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-sm">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                    <div>
                      <span className="font-medium">{f.filename}</span>
                      <p className="text-xs text-muted-foreground">{f.error}</p>
                    </div>
                  </div>
                ))}
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
              Works with text-based chord charts (e.g. exported from SongBook Pro). Choose one or
              several PDFs at once — we pull out the title, artist, key, and section structure for
              each; you can review and edit everything after import. For your team&apos;s internal
              use only; make sure your CCLI license covers reproducing this content.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary"
            >
              <FileUp className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">
                {files.length > 0
                  ? `${files.length} file${files.length === 1 ? "" : "s"} selected — click to add more`
                  : "Click to choose one or more PDF files"}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                // Reset after snapshotting into a plain array above, not before —
                // e.target.files is a live reference to the input, and clearing
                // the input's value first was silently emptying it before React
                // got to read it, dropping every selected file.
                e.target.value = "";
              }}
            />

            {files.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-danger"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full" disabled={files.length === 0 || importing} onClick={handleImport}>
              {importing
                ? progress && progress.total > 1
                  ? `Importing batch ${progress.done + 1} of ${progress.total}…`
                  : "Importing…"
                : files.length > 1
                  ? `Import ${files.length} songs`
                  : "Import"}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
