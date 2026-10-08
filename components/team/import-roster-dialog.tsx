"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  importRosterFromSpreadsheet,
  importRosterFromImage,
  type RosterImportSummary,
} from "@/lib/actions/roster-import";

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export function ImportRosterDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RosterImportSummary | null>(null);
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
    const isSpreadsheet = SPREADSHEET_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    const formData = new FormData();
    formData.set("file", file);
    const result = isSpreadsheet
      ? await importRosterFromSpreadsheet(formData)
      : await importRosterFromImage(formData);
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
        <Upload className="h-4 w-4" /> Import Roster
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Import a roster"
      >
        {summary ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">Roster imported</p>
            <p className="text-sm text-muted-foreground">
              {summary.membersCreated} team member{summary.membersCreated === 1 ? "" : "s"} added,{" "}
              {summary.membersUpdated} updated
              {summary.servicesCreated > 0 &&
                `, ${summary.servicesCreated} service${summary.servicesCreated === 1 ? "" : "s"} created`}
              .
            </p>

            {summary.dateResults.length > 0 ? (
              <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                {summary.dateResults.map((d) => (
                  <div key={d.serviceId}>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {d.dateText}
                      {d.serviceCreated && " (new)"}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {d.roster.map((r, i) => (
                        <li key={i} className="text-sm">
                          <span className="text-success">✓</span> {r.name} — {r.role}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No dates in the file matched or could be scheduled, so just the team roster was
                updated.
              </p>
            )}

            {summary.needsReview.length > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                <p className="text-sm font-semibold text-warning">
                  ⚠ {summary.needsReview.length} item{summary.needsReview.length === 1 ? "" : "s"} need
                  {summary.needsReview.length === 1 ? "s" : ""} attention
                </p>
                <ul className="mt-1 space-y-1">
                  {summary.needsReview.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {r.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.rowsSkipped > 0 && (
              <p className="text-xs text-muted-foreground">
                {summary.rowsSkipped} row{summary.rowsSkipped === 1 ? "" : "s"} skipped (no name).
              </p>
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
              Upload a spreadsheet (.xlsx/.csv with Name, Role, and optionally Date columns) or a
              clear, typed roster image. Adds/updates people on your Team, and schedules or updates
              a service for each Date in the file — which then shows up right here on Roster.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">
                {file ? file.name : "Click to choose a spreadsheet or image"}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full" disabled={!file || importing} onClick={handleImport}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
