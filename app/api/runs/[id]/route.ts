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
