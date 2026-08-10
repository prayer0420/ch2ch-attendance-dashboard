import { NextRequest, NextResponse } from "next/server";
import {
  applyQrAttendancePreview,
  createQrAttendancePreview,
  hydrateQrAttendancePreview,
  verifyQrAttendancePreview,
  qrAttendanceDefaults
} from "@/lib/qr-attendance-sync";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";

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

async function queueQrJob(body: Record<string, unknown>) {
  if (!hasSupabaseEnv()) throw new Error("Vercel 환경변수에 Supabase 연결 정보를 설정해 주세요.");
  const supabase = getServiceSupabase();
  const action = String(body.action || "preview");
  const preview = action === "apply" ? body.preview : null;
  if (action === "apply" && (!preview || typeof preview !== "object")) {
    throw new Error("먼저 QR 명단 미리보기를 완료해 주세요.");
  }
  const week = Number(body.week ?? (preview as { week?: number } | null)?.week);
  if (!Number.isInteger(week) || week < 1 || week > 53) throw new Error("주차는 1주부터 53주 사이로 입력해 주세요.");
  const { data, error } = await supabase.from("qr_sync_jobs").insert({
    action,
    status: "queued",
    week,
    sheet_url: String(body.sheetUrl || (preview as { sheetUrl?: string } | null)?.sheetUrl || qrAttendanceDefaults.sheetUrl),
    sheet_tab: String(body.sheetTab || (preview as { sheetTab?: string } | null)?.sheetTab || qrAttendanceDefaults.sheetTab),
    department: qrAttendanceDefaults.department,
    preview
  }).select("id,status").single();
  if (error) throw new Error(`QR 작업 요청 저장 실패: ${error.message}`);
  return { queued: true, jobId: data.id, status: data.status };
}

async function readQrJob(jobId: string) {
  if (!hasSupabaseEnv()) throw new Error("Vercel 환경변수에 Supabase 연결 정보를 설정해 주세요.");
  const { data, error } = await getServiceSupabase().from("qr_sync_jobs").select("id,status,result,error_message").eq("id", jobId).single();
  if (error) throw new Error(`QR 작업 상태를 읽지 못했습니다: ${error.message}`);
  return {
    jobId: data.id,
    status: data.status,
    preview: data.result || null,
    error: data.error_message || null
  };
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!isLocalRequest(request) && jobId) {
    try { return json({ data: await readQrJob(jobId) }); }
    catch (error) { return json({ error: error instanceof Error ? error.message : "QR 작업 상태 조회 실패" }, 500); }
  }
  if (!isLocalRequest(request)) return json({ data: { defaults: qrAttendanceDefaults, remoteQueue: true } });
  return json({ defaults: qrAttendanceDefaults });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "preview");

    if (!isLocalRequest(request)) return json({ data: await queueQrJob(body) }, 202);

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
