"use server";

import { revalidatePath } from "next/cache";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { parseChordChartText } from "@/lib/songs/pdf-import";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a chord chart, well under Vercel's body limit

export async function importSongFromPdf(formData: FormData) {
  const { team } = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No PDF file was provided.");
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF is too large (max 10MB).");
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please upload a PDF file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const parser = new PDFParse({ data: buffer });
  let text: string;
  try {
    const result = await parser.getText();
    text = result.text;
  } catch (err) {
    console.error("PDF text extraction failed:", err);
    throw new Error("Could not read that PDF — it may be a scanned image rather than text.");
  } finally {
    await parser.destroy();
  }

  const parsed = parseChordChartText(text);

  const song = await prisma.song.create({
    data: {
      teamId: team.id,
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

  revalidatePath("/songs");
  return { id: song.id };
}
