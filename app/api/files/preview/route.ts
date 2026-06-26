import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { decodeInputBuffer, parseAttendanceCsv, rowsToCsv } from "@/lib/attendance-input-parser";

const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".pdf"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function rowsFromPdfText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t| {2,}/).map((cell) => cell.trim()).filter(Boolean));
}

type PdfTextItem = {
  str: string;
  transform: number[];
  width?: number;
};

async function csvFromPdfBuffer(buffer: Buffer) {
  const pdfParse = eval("require")("pdf-parse") as (input: Buffer, options?: unknown) => Promise<{ text: string }>;

  const positionalRows: string[][] = [];
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: PdfTextItem[] }> }) => {
      const content = await pageData.getTextContent();
      const lineMap = new Map<number, PdfTextItem[]>();

      for (const item of content.items) {
        const text = item.str.trim();
        if (!text) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const line = lineMap.get(y) ?? [];
        line.push(item);
        lineMap.set(y, line);
      }

      const pageRows = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => {
          const sorted = items.sort((a, b) => a.transform[4] - b.transform[4]);
          const cells: string[] = [];
          let current = "";
          let lastEnd = Number.NEGATIVE_INFINITY;

          for (const item of sorted) {
            const x = item.transform[4];
            const gap = x - lastEnd;
            if (current && gap > 14) {
              cells.push(current.trim());
              current = "";
            }
            current += item.str;
            lastEnd = x + (item.width ?? item.str.length * 7);
          }
          if (current.trim()) cells.push(current.trim());
          return cells;
        })
        .filter((row) => row.some(Boolean));

      positionalRows.push(...pageRows);
      return rowsToCsv(pageRows);
    }
  });

  if (positionalRows.some((row) => row.length >= 4)) {
    return rowsToCsv(positionalRows);
  }
  return rowsToCsv(rowsFromPdfText(parsed.text));
}

async function csvFromFile(file: File, tabName: string) {
  const extension = path.extname(file.name).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("지원 형식은 CSV, XLSX, XLS, PDF입니다.");
  }

  if (extension === ".csv") {
    return decodeInputBuffer(await file.arrayBuffer());
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.find((name) => name.trim() === tabName.trim());
    if (!sheetName) {
      throw new Error(`엑셀 파일에 '${tabName}' 탭이 없습니다. 발견된 탭: ${workbook.SheetNames.join(", ")}`);
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("엑셀 파일에서 읽을 수 있는 시트를 찾지 못했습니다.");
    return XLSX.utils.sheet_to_csv(sheet);
  }

  return await csvFromPdfBuffer(buffer);
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const tabName = String(form.get("googleSheetTab") ?? "가장체크");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "미리볼 파일을 선택해 주세요." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일은 20MB 이하만 미리볼 수 있습니다." }, { status: 400 });
    }

    const csv = await csvFromFile(file, tabName);
    const parsed = parseAttendanceCsv(csv);

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      rows: parsed.previewRows,
      people: parsed.people.slice(0, 20),
      totalPeople: parsed.people.length,
      layout: parsed.layout,
      message: `${file.name}에서 ${parsed.people.length}명을 읽었습니다.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "파일 미리보기에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
