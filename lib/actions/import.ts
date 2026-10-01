"use server";

import { revalidatePath } from "next/cache";
import "@/lib/songs/pdf-dom-polyfill";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { parseChordChartText } from "@/lib/songs/pdf-import";
import { runAction, type ActionResultData } from "@/lib/actions/action-result";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a chord chart, well under Vercel's body limit

export type PdfImportSummary = {
  imported: { id: string; title: string; filename: string }[];
  failed: { filename: string; error: string }[];
};

type OneFileResult =
  | { ok: true; id: string; title: string; filename: string }
  | { ok: false; filename: string; error: string };

// pdf-parse's underlying worker has been observed to hang indefinitely
// rather than reject in some environments, leaving a request stuck forever
// with no error to show — bound every parse so a single bad PDF can never
// take the whole import down with it.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
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

async function importOnePdf(teamId: string, file: File): Promise<OneFileResult> {
  const filename = file.name;

  if (file.size > MAX_PDF_BYTES) return { ok: false, filename, error: "Too large (max 10MB)." };
  if (file.type && file.type !== "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) {
    return { ok: false, filename, error: "Not a PDF file." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  let text: string;
  try {
    const result = await withTimeout(parser.getText(), 25_000, "PDF text extraction");
    text = result.text;
  } catch (err) {
    console.error(`PDF text extraction failed for ${filename}:`, err);
    // Fire-and-forget: destroy() itself could hang too, and we've already
    // decided this file failed, so don't let cleanup block the response.
    void parser.destroy().catch(() => {});
    return {
      ok: false,
      filename,
      error: "Could not read this PDF — it may be a scanned image, or it took too long to process. Try again.",
    };
  }
  void parser.destroy().catch(() => {});

  // Everything after a successful parse (turning the text into a title/
  // sections guess, then creating the row) can still throw — a DB error,
  // or an edge case in the parsing itself — and an uncaught throw here
  // means the whole batch fails with an opaque, redacted production error
  // instead of a message naming the actual file and problem.
  try {
    const parsed = parseChordChartText(text);

    // getText() can succeed with nothing usable in it — an image-only PDF
    // with no text layer, or a genuinely blank file (pdf-parse still
    // returns its own page-marker footer text even then, so checking the
    // raw text for blankness doesn't catch this; checking what actually
    // came out the other end of parsing does). Unguarded, this fell
    // through into creating a junk "Untitled Song" with zero sections —
    // no error, no content, no way to tell the import "worked" from the
    // file actually being unreadable.
    if (parsed.title === "Untitled Song" && parsed.sections.length === 0) {
      return {
        ok: false,
        filename,
        error: "No readable text found in this PDF — it may be a scanned image with no text layer.",
      };
    }

    const song = await prisma.song.create({
      data: {
        teamId,
        title: parsed.title,
        artist: parsed.artist,
        key: parsed.key,
        sections: {
          create: parsed.sections.map((s, order) => ({
            label: s.label,
            order,
            lyricsChords: s.content || null,
          })),
        },
      },
    });

    return { ok: true, id: song.id, title: song.title, filename };
  } catch (err) {
    console.error(`Creating song from ${filename} failed:`, err);
    return { ok: false, filename, error: "Couldn't save this song — please try importing it again." };
  }
}

// Accepts one or more PDF files under the "file" field. Each file is
// parsed and created independently — one bad file (scanned image, wrong
// type, too large) doesn't stop the rest of the batch from importing.
export async function importSongsFromPdfs(formData: FormData): Promise<ActionResultData<PdfImportSummary>> {
  return runAction(async () => {
    const { team } = await requireUser();

    const files = formData.getAll("file").filter((f): f is File => f instanceof File);
    if (files.length === 0) return { ok: false, error: "No PDF file was provided." };

    const summary: PdfImportSummary = { imported: [], failed: [] };
    // Sequential on purpose: keeps memory/DB load bounded for a batch of
    // PDFs rather than parsing them all in parallel.
    for (const file of files) {
      const result = await importOnePdf(team.id, file);
      if (result.ok) {
        summary.imported.push({ id: result.id, title: result.title, filename: result.filename });
      } else {
        summary.failed.push({ filename: result.filename, error: result.error });
      }
    }

    revalidatePath("/songs");
    return { ok: true, data: summary };
  });
}
