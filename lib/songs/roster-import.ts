import ExcelJS from "exceljs";

export type RosterRow = { name: string; role: string; dateText: string | null };

const NAME_HEADER_RE = /name|member|musician|person/i;
const ROLE_HEADER_RE = /role|position|instrument|part/i;
const DATE_HEADER_RE = /date|service|sunday|week/i;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String((value as { result: unknown }).result ?? "");
    if (value instanceof Date) return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function detectColumns(headerRow: ExcelJS.Row) {
  let nameCol = -1;
  let roleCol = -1;
  let dateCol = -1;
  let found = false;

  headerRow.eachCell((cell, colNumber) => {
    const text = cellText(cell.value);
    if (nameCol === -1 && NAME_HEADER_RE.test(text)) {
      nameCol = colNumber;
      found = true;
    } else if (roleCol === -1 && ROLE_HEADER_RE.test(text)) {
      roleCol = colNumber;
      found = true;
    } else if (dateCol === -1 && DATE_HEADER_RE.test(text)) {
      dateCol = colNumber;
      found = true;
    }
  });

  if (nameCol === -1) nameCol = 1;
  if (roleCol === -1) roleCol = nameCol === 1 ? 2 : 1;

  return { nameCol, roleCol, dateCol, headerFound: found };
}

function extractRows(sheet: ExcelJS.Worksheet): RosterRow[] {
  const { nameCol, roleCol, dateCol, headerFound } = detectColumns(sheet.getRow(1));
  const startRow = headerFound ? 2 : 1;

  const rows: RosterRow[] = [];
  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const name = cellText(row.getCell(nameCol).value);
    const role = roleCol > 0 ? cellText(row.getCell(roleCol).value) : "";
    const dateText = dateCol > 0 ? cellText(row.getCell(dateCol).value) : null;
    if (name) rows.push({ name, role: role || "Other", dateText: dateText || null });
  }
  return rows;
}

export async function parseRosterWorkbookBuffer(buffer: Buffer): Promise<RosterRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  return extractRows(sheet);
}

export async function parseRosterCsvBuffer(buffer: Buffer): Promise<RosterRow[]> {
  const workbook = new ExcelJS.Workbook();
  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);
  const sheet = await workbook.csv.read(stream);
  return extractRows(sheet);
}
