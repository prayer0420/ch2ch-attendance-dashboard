import { checkRequestSecurity } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { assertQrSelectionMatches, readQrSelection } from "@/lib/qr-selection";
import {
  applyQrAttendancePreview,
  createQrAttendancePreview,
  hydrateQrAttendancePreview,
  verifyQrAttendancePreview
} from "@/lib/qr-attendance-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const denied = await checkRequestSecurity(request, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const action = String(body?.action || "preview");
    const preview = body?.preview;
    if (action === "preview") {
      const result = await createQrAttendancePreview(body.input);
      return NextResponse.json({ data: result });
    }
    if (!preview?.id) throw new Error("QR 미리보기 데이터가 없습니다.");
    const selection = readQrSelection(body.input);
    assertQrSelectionMatches(preview, selection);
    hydrateQrAttendancePreview(preview);
    const result = action === "verify"
      ? await verifyQrAttendancePreview(preview.id)
      : await applyQrAttendancePreview(preview.id, selection);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "QR 작업 실패" }, { status: 500 });
  }
}
