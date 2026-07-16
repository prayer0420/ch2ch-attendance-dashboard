import { NextRequest, NextResponse } from "next/server";
import {
  applyQrAttendancePreview,
  createQrAttendancePreview,
  verifyQrAttendancePreview,
  qrAttendanceDefaults
} from "@/lib/qr-attendance-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}

function isLocalRequest(request: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname);
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) return json({ error: "QR 출석 동기화는 이 컴퓨터의 로컬 홈페이지에서만 사용할 수 있습니다." }, 403);
  return json({ defaults: qrAttendanceDefaults });
}

export async function POST(request: NextRequest) {
  try {
    if (!isLocalRequest(request)) return json({ error: "QR 출석 동기화는 이 컴퓨터의 로컬 홈페이지에서만 사용할 수 있습니다." }, 403);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "preview");

    if (action === "apply") {
      const previewId = String(body?.previewId || "").trim();
      if (!previewId) return json({ error: "먼저 CH2CH 명단을 불러와 미리보기를 확인해 주세요." }, 400);
      const result = await applyQrAttendancePreview(previewId);
      return json({ data: result });
    }

    if (action === "verify") {
      const previewId = String(body?.previewId || "").trim();
      if (!previewId) return json({ error: "먼저 CH2CH 명단을 불러와 주세요." }, 400);
      const result = await verifyQrAttendancePreview(previewId);
      return json({ data: result });
    }

    const week = Number(body?.week);
    if (!Number.isInteger(week) || week < 1 || week > 53) return json({ error: "주차는 1주부터 53주 사이로 입력해 주세요." }, 400);
    const preview = await createQrAttendancePreview({
      week,
      sheetUrl: String(body?.sheetUrl || qrAttendanceDefaults.sheetUrl).trim(),
      sheetTab: String(body?.sheetTab || qrAttendanceDefaults.sheetTab).trim(),
      department: qrAttendanceDefaults.department
    });
    return json({ data: preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR 출석 동기화 중 오류가 발생했습니다.";
    return json({ error: message }, 500);
  }
}
