import { NextRequest, NextResponse } from "next/server";
import { mockWeeklyRecords } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/status";

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get("week");
  const family = request.nextUrl.searchParams.get("family");
  const name = request.nextUrl.searchParams.get("name");
  const service = request.nextUrl.searchParams.get("service");
  const failuresOnly = request.nextUrl.searchParams.get("failuresOnly") === "true";

  if (!hasSupabaseEnv()) {
    const data = mockWeeklyRecords.filter((record) => {
      if (week && record.target_week !== Number(week)) return false;
      if (family && !record.family?.includes(family)) return false;
      if (name && !record.normalized_name.includes(normalizeName(name))) return false;
      if (service === "1-3" && !record.service_1_3_present) return false;
      if (service === "4" && !record.service_4_present) return false;
      if (failuresOnly && !["final_fail", "save_failed"].includes(record.status ?? "")) return false;
      return true;
    });
    return NextResponse.json({ data, demo: true });
  }

  const supabase = getServiceSupabase();
  let query = supabase
    .from("attendance_weekly_records")
    .select("*")
    .order("target_week", { ascending: false })
    .order("family", { ascending: true });

  if (week) query = query.eq("target_week", Number(week));
  if (family) query = query.ilike("family", `%${family}%`);
  if (name) query = query.ilike("normalized_name", `%${normalizeName(name)}%`);
  if (service === "1-3") query = query.eq("service_1_3_present", true);
  if (service === "4") query = query.eq("service_4_present", true);
  if (failuresOnly) query = query.in("status", ["final_fail", "save_failed"]);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
