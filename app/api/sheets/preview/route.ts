import { NextRequest, NextResponse } from "next/server";
import { parseAttendanceCsv } from "@/lib/attendance-input-parser";

function extractSheetInfo(url: string) {
  const idMatch = url.match(/\/spreadsheets\/d\/([^/]+)/);
  const publishedMatch = url.match(/\/spreadsheets\/d\/e\/([^/]+)/);
  const gidMatch = url.match(/[?&#]gid=(\d+)/);

  return {
    spreadsheetId: idMatch?.[1] ?? null,
    publishedId: publishedMatch?.[1] ?? null,
    gid: gidMatch?.[1] ?? "0"
  };
}

function buildExportUrl(url: string, tabName: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if ((parsed.searchParams.get("output") === "csv" || parsed.searchParams.get("format") === "csv") && parsed.hostname.includes("docs.google.com")) {
    return url;
  }

  const { spreadsheetId, publishedId, gid } = extractSheetInfo(url);
  if (spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName || "가장체크")}`;
  }
  if (publishedId) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/e/${publishedId}/pub`);
    exportUrl.searchParams.set("output", "csv");
    if (gid) exportUrl.searchParams.set("gid", gid);
    return exportUrl.toString();
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const googleSheetUrl = String(body.googleSheetUrl ?? "");
  const googleSheetTab = String(body.googleSheetTab ?? "");
  const { spreadsheetId, publishedId, gid } = extractSheetInfo(googleSheetUrl);

  const exportUrl = buildExportUrl(googleSheetUrl, googleSheetTab || "가장체크");
  if (!exportUrl) {
    return NextResponse.json({ error: "구글시트 URL 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const response = await fetch(exportUrl, { cache: "no-store" });
    const text = await response.text();

    if (!response.ok || text.includes("<!DOCTYPE html")) {
      return NextResponse.json({
        ok: true,
        spreadsheetId: spreadsheetId ?? publishedId,
        gid,
        googleSheetTab,
        exportUrl,
        rows: [],
        message: "URL은 확인했습니다. 다만 시트가 비공개라서 홈페이지에서 직접 미리보기는 못 했습니다. Runner는 로컬 권한/기존 로직으로 읽게 연결해야 합니다."
      });
    }

    const parsed = parseAttendanceCsv(text);

    return NextResponse.json({
      ok: true,
      spreadsheetId: spreadsheetId ?? publishedId,
      gid,
      googleSheetTab,
      exportUrl,
      rows: parsed.previewRows,
      people: parsed.people.slice(0, 20),
      totalPeople: parsed.people.length,
      layout: parsed.layout,
      warnings: parsed.warnings,
      message: `입력 데이터에서 출석 대상 ${parsed.people.length}명을 읽었습니다.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구글시트 미리보기에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
