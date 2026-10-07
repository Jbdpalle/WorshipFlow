import ExcelJS from "exceljs";

export type SongMetadataRow = {
  title: string;
  themeCategories: string[];
  tags: string[];
  bibleVerses: string[];
  biblicalConnection: string | null;
  key: string | null;
  bpm: number | null;
  timeSignature: string | null;
  worshipType: string | null;
};

const TITLE_HEADER_RE = /^title$|song/i;
const THEME_HEADER_RE = /theme/i;
const TAGS_HEADER_RE = /^tags?$/i;
const VERSE_HEADER_RE = /verse|bible|scripture/i;
const CONNECTION_HEADER_RE = /connection|note/i;
const KEY_HEADER_RE = /^key$/i;
const BPM_HEADER_RE = /bpm|tempo/i;
const TIME_SIG_HEADER_RE = /time\s*sig/i;
const WORSHIP_TYPE_HEADER_RE = /praise.*worship|worship.*type/i;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String((value as { result: unknown }).result ?? "");
    if (value instanceof Date) return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function splitList(text: string): string[] {
  return text
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function detectColumns(headerRow: ExcelJS.Row) {
  const cols: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const text = cellText(cell.value);
    if (!cols.title && TITLE_HEADER_RE.test(text)) cols.title = colNumber;
    else if (!cols.theme && THEME_HEADER_RE.test(text)) cols.theme = colNumber;
    else if (!cols.tags && TAGS_HEADER_RE.test(text)) cols.tags = colNumber;
    else if (!cols.verse1 && VERSE_HEADER_RE.test(text)) cols.verse1 = colNumber;
    else if (cols.verse1 && !cols.verse2 && VERSE_HEADER_RE.test(text)) cols.verse2 = colNumber;
    else if (!cols.connection && CONNECTION_HEADER_RE.test(text)) cols.connection = colNumber;
    else if (!cols.key && KEY_HEADER_RE.test(text)) cols.key = colNumber;
    else if (!cols.bpm && BPM_HEADER_RE.test(text)) cols.bpm = colNumber;
    else if (!cols.timeSignature && TIME_SIG_HEADER_RE.test(text)) cols.timeSignature = colNumber;
    else if (!cols.worshipType && WORSHIP_TYPE_HEADER_RE.test(text)) cols.worshipType = colNumber;
  });
  if (!cols.title) cols.title = 1;
  return cols;
}

function extractRows(sheet: ExcelJS.Worksheet): SongMetadataRow[] {
  const cols = detectColumns(sheet.getRow(1));
  const rows: SongMetadataRow[] = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const title = cellText(row.getCell(cols.title).value);
    if (!title) continue;

    const bibleVerses = [
      cols.verse1 ? cellText(row.getCell(cols.verse1).value) : "",
      cols.verse2 ? cellText(row.getCell(cols.verse2).value) : "",
    ].filter(Boolean);

    const bpmText = cols.bpm ? cellText(row.getCell(cols.bpm).value) : "";
    const bpm = bpmText && /^\d+$/.test(bpmText) ? Number(bpmText) : null;

    rows.push({
      title,
      themeCategories: cols.theme ? splitList(cellText(row.getCell(cols.theme).value)) : [],
      tags: cols.tags ? splitList(cellText(row.getCell(cols.tags).value)) : [],
      bibleVerses,
      biblicalConnection: cols.connection ? cellText(row.getCell(cols.connection).value) || null : null,
      key: cols.key ? cellText(row.getCell(cols.key).value) || null : null,
      bpm,
      timeSignature: cols.timeSignature ? cellText(row.getCell(cols.timeSignature).value) || null : null,
      worshipType: cols.worshipType ? cellText(row.getCell(cols.worshipType).value) || null : null,
    });
  }

  return rows;
}

export async function parseSongMetadataWorkbookBuffer(buffer: Buffer): Promise<SongMetadataRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  return extractRows(sheet);
}

export async function parseSongMetadataCsvBuffer(buffer: Buffer): Promise<SongMetadataRow[]> {
  const workbook = new ExcelJS.Workbook();
  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);
  const sheet = await workbook.csv.read(stream);
  return extractRows(sheet);
}
