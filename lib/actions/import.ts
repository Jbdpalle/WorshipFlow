"use server";

import { revalidatePath } from "next/cache";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { parseChordChartText } from "@/lib/songs/pdf-import";
import type { ActionResultData } from "@/lib/actions/action-result";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a chord chart, well under Vercel's body limit

export type PdfImportSummary = {
  imported: { id: string; title: string; filename: string }[];
  failed: { filename: string; error: string }[];
};

type OneFileResult =
  | { ok: true; id: string; title: string; filename: string }
  | { ok: false; filename: string; error: string };

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
    const result = await parser.getText();
    text = result.text;
  } catch (err) {
    console.error(`PDF text extraction failed for ${filename}:`, err);
    return { ok: false, filename, error: "Could not read this PDF — it may be a scanned image rather than text." };
  } finally {
    await parser.destroy();
  }

  const parsed = parseChordChartText(text);

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
}

// Accepts one or more PDF files under the "file" field. Each file is
// parsed and created independently — one bad file (scanned image, wrong
// type, too large) doesn't stop the rest of the batch from importing.
export async function importSongsFromPdfs(formData: FormData): Promise<ActionResultData<PdfImportSummary>> {
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
}
