import { NextResponse } from "next/server";
import { mockRun } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ data: { ...mockRun, id }, demo: true });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("attendance_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "데모 실행은 중지할 수 없습니다." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  if (body?.action !== "cancel") {
    return NextResponse.json({ error: "지원하지 않는 실행 제어 요청입니다." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: current, error: readError } = await supabase
    .from("attendance_runs")
    .select("id,status")
    .eq("id", id)
    .single();
  if (readError || !current) return NextResponse.json({ error: readError?.message ?? "실행을 찾지 못했습니다." }, { status: 404 });

  if (["completed", "partial_success", "failed", "cancelled", "dry_run_completed"].includes(current.status)) {
    return NextResponse.json({ error: "이미 종료된 실행입니다." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("attendance_runs")
    .update({ status: "cancelled", finished_at: new Date().toISOString(), current_step: "사용자 요청으로 실행 중지" })
    .eq("id", id)
    .in("status", ["queued", "picked_up", "running", "saving"])
    .select("id,status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "실행 상태가 이미 변경되었습니다." }, { status: 409 });
  return NextResponse.json({ data });
}
