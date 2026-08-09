import { NextRequest, NextResponse } from "next/server";
import {
  applyQrAttendancePreview,
  createQrAttendancePreview,
  hydrateQrAttendancePreview,
  verifyQrAttendancePreview
} from "@/lib/qr-attendance-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const expected = process.env.QR_WORKER_TOKEN || "";
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname);
  return localHost || (Boolean(expected) && request.headers.get("x-qr-worker-token") === expected);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "QR Worker 인증 실패" }, { status: 401 });
  try {
    const body = await request.json();
    const action = String(body?.action || "preview");
    const preview = body?.preview;
    if (action === "preview") {
      const result = await createQrAttendancePreview(body.input);
      return NextResponse.json({ data: result });
    }
    if (!preview?.id) throw new Error("QR 미리보기 데이터가 없습니다.");
    hydrateQrAttendancePreview(preview);
    const result = action === "verify"
      ? await verifyQrAttendancePreview(preview.id)
      : await applyQrAttendancePreview(preview.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "QR 작업 실패" }, { status: 500 });
  }
}
