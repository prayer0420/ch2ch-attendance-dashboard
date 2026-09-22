import { checkRequestSecurity } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { mockWeeklyRecords } from "@/lib/mock-data";
import { normalizeName } from "@/lib/status";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";
import { readPagination } from "@/lib/api-pagination";

export async function GET(request: NextRequest) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  const params = request.nextUrl.searchParams;
  const pagination = readPagination(params);
  if (!pagination) return NextResponse.json({ error: "page는 1~100000, pageSize는 1~100 사이의 정수여야 합니다." }, { status: 400 });
  const { page, pageSize, from, to } = pagination;
  const week = params.get("week");
  const family = params.get("family");
  const name = params.get("name");
  const service = params.get("service");
  const failuresOnly = params.get("failuresOnly") === "true";
  if (week && (!Number.isInteger(Number(week)) || Number(week) < 1 || Number(week) > 53)) return NextResponse.json({ error: "주차는 1~53 사이의 정수여야 합니다." }, { status: 400 });
  if (service && !["1-3", "4"].includes(service)) return NextResponse.json({ error: "예배 구분은 1-3 또는 4입니다." }, { status: 400 });
  if ((family?.length ?? 0) > 100 || (name?.length ?? 0) > 100) return NextResponse.json({ error: "검색어는 100자 이하로 입력해 주세요." }, { status: 400 });
  if (hasSupabaseEnv()) {
    // Apply filters before pagination; never substitute demo rows on database errors.
    let query = getServiceSupabase().from("attendance_weekly_records").select("*")
      .order("target_week", { ascending: false }).order("id", { ascending: true });
    const literalLike = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;
    if (week) query = query.eq("target_week", Number(week));
    if (family) query = query.like("family", literalLike(family));
    if (name) query = query.like("normalized_name", literalLike(normalizeName(name)));
    if (service === "1-3") query = query.eq("service_1_3_present", true);
    if (service === "4") query = query.eq("service_4_present", true);
    if (failuresOnly) query = query.in("status", ["final_fail", "save_failed"]);
    const { data, error } = await query.range(from, to);
    if (error) return NextResponse.json({ error: "출석 이력을 조회하지 못했습니다. 저장소 연결 상태를 확인해 주세요." }, { status: 503 });
    return NextResponse.json({ data, demo: false, page, pageSize });
  }
  const data = mockWeeklyRecords.filter((record) => {
    if (week && record.target_week !== Number(week)) return false;
    if (family && !record.family?.includes(family)) return false;
    if (name && !record.normalized_name.includes(normalizeName(name))) return false;
    if (service === "1-3" && !record.service_1_3_present) return false;
    if (service === "4" && !record.service_4_present) return false;
    if (failuresOnly && !["final_fail", "save_failed"].includes(record.status ?? "")) return false;
    return true;
  });
  return NextResponse.json({ data: data.slice(from, to + 1), demo: true, page, pageSize });
}
