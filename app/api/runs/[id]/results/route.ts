import { NextRequest, NextResponse } from "next/server";
import { mockResults } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = request.nextUrl.searchParams.get("status");

  if (!hasSupabaseEnv()) {
    const data = mockResults
      .filter((result) => result.run_id === "demo-run-24")
      .filter((result) => !status || result.status === status)
      .map((result) => ({ ...result, run_id: id }));
    return NextResponse.json({ data, demo: true });
  }

  const supabase = getServiceSupabase();
  let query = supabase
    .from("attendance_results")
    .select("*")
    .eq("run_id", id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
