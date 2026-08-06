import { NextResponse } from "next/server";
import { mockEvents } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      data: mockEvents.map((event) => ({ ...event, run_id: id })),
      demo: true
    });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("run_events")
    .select("*")
    .eq("run_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
