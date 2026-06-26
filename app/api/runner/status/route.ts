import { NextResponse } from "next/server";
import { mockHeartbeat } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ data: mockHeartbeat, demo: true });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("runner_heartbeats")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
