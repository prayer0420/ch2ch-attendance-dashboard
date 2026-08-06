import { NextRequest, NextResponse } from "next/server";
import { mockWeeklyRecords } from "@/lib/mock-data";
import { normalizeName } from "@/lib/status";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const week = params.get("week");
  const family = params.get("family");
  const name = params.get("name");
  const service = params.get("service");
  const failuresOnly = params.get("failuresOnly") === "true";
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
