import { checkRequestSecurity } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import {
  applyQrAttendancePreview,
  createQrAttendancePreview,
  hydrateQrAttendancePreview,
  verifyQrAttendancePreview,
  qrAttendanceDefaults
} from "@/lib/qr-attendance-sync";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";
import { assertQrSelectionMatches, readQrSelection } from "@/lib/qr-selection";

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
  // Next's URL can remain loopback behind ngrok. Routing is based on the browser
  // Host after checkRequestSecurity has validated authentication and the origin.
  const host = request.headers.get("host") || request.nextUrl.host;
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
}

async function queueQrJob(body: Record<string, unknown>) {
  if (!hasSupabaseEnv()) throw new Error("서버의 PC 저장소 연결을 확인해 주세요.");
  const supabase = getServiceSupabase();
  const action = String(body.action || "preview");
  const preview = action === "apply" ? body.preview : null;
  if (action === "apply" && (!preview || typeof preview !== "object")) {
    throw new Error("먼저 QR 명단 미리보기를 완료해 주세요.");
  }
  const selection = readQrSelection(body);
  if (action === "apply") assertQrSelectionMatches(preview, selection);
  const { data, error } = await supabase.from("qr_sync_jobs").insert({
    action,
    status: "queued",
    week: selection.week,
    sheet_url: selection.sheetUrl,
    sheet_tab: selection.sheetTab,
    department: qrAttendanceDefaults.department,
    preview
  }).select("id,status").single();
  if (error) throw new Error(`QR 작업 요청 저장 실패: ${error.message}`);
  return { queued: true, jobId: data.id, status: data.status };
}

async function readQrJob(jobId: string) {
  if (!hasSupabaseEnv()) throw new Error("서버의 PC 저장소 연결을 확인해 주세요.");
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
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!isLocalRequest(request) && jobId) {
    try { return json({ data: await readQrJob(jobId) }); }
    catch (error) { return json({ error: error instanceof Error ? error.message : "QR 작업 상태 조회 실패" }, 500); }
  }
  if (!isLocalRequest(request)) return json({ data: { defaults: qrAttendanceDefaults, remoteQueue: true } });
  return json({ defaults: qrAttendanceDefaults });
}

export async function POST(request: NextRequest) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "preview");

    if (!isLocalRequest(request)) return json({ data: await queueQrJob(body) }, 202);

    if (action === "apply") {
      // Compatibility with already-open mobile clients behind a local tunnel.
      // Resolve the server's cached preview; never hydrate client-supplied names here.
      const previewId = String(body?.previewId || body?.preview?.id || "").trim();
      if (!previewId) return json({ error: "먼저 CH2CH 명단을 불러와 미리보기를 확인해 주세요." }, 400);
      const result = await applyQrAttendancePreview(previewId, readQrSelection(body));
      return json({ data: result });
    }

    if (action === "verify") {
      const previewId = String(body?.previewId || "").trim();
      if (!previewId) return json({ error: "먼저 CH2CH 명단을 불러와 주세요." }, 400);
      const result = await verifyQrAttendancePreview(previewId);
      return json({ data: result });
    }

    const preview = await createQrAttendancePreview({
      ...readQrSelection(body),
      department: qrAttendanceDefaults.department
    });
    return json({ data: preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR 출석 동기화 중 오류가 발생했습니다.";
    return json({ error: message }, 500);
  }
}
