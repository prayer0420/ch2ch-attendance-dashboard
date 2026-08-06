import { mockEvents, mockHeartbeat, mockResults, mockRun, mockRuns, mockWeeklyRecords } from "./mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "./supabase/server";

export async function getDashboardData() {
  if (!hasSupabaseEnv()) {
    return {
      runs: mockRuns,
      latestRun: mockRuns[0],
      failures: mockResults.filter((result) => ["final_fail", "save_failed"].includes(result.status)),
      heartbeat: mockHeartbeat,
      demo: true
    };
  }

  const supabase = getServiceSupabase();
  const [{ data: runs }, { data: heartbeat }] = await Promise.all([
    supabase.from("attendance_runs").select("*").order("requested_at", { ascending: false }).limit(10),
    supabase.from("runner_heartbeats").select("*").order("last_seen_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const latestRun = runs?.[0] ?? null;
  const { data: failures } = latestRun
    ? await supabase
        .from("attendance_results")
        .select("*")
        .eq("run_id", latestRun.id)
        .in("status", ["final_fail", "save_failed"])
    : { data: [] };

  return { runs: runs ?? [], latestRun, failures: failures ?? [], heartbeat, demo: false };
}

export async function getRunDetail(id: string) {
  if (!hasSupabaseEnv()) {
    return {
      run: { ...mockRun, id },
      results: mockResults.map((result) => ({ ...result, run_id: id })),
      events: mockEvents.map((event) => ({ ...event, run_id: id })),
      demo: true
    };
  }

  const supabase = getServiceSupabase();
  const [{ data: run }, { data: results }, { data: events }] = await Promise.all([
    supabase.from("attendance_runs").select("*").eq("id", id).single(),
    supabase.from("attendance_results").select("*").eq("run_id", id).order("created_at", { ascending: false }),
    supabase.from("run_events").select("*").eq("run_id", id).order("created_at", { ascending: false }).limit(100)
  ]);

  return { run, results: results ?? [], events: events ?? [], demo: false };
}

export async function getRunResults(id: string, status?: string) {
  if (!hasSupabaseEnv()) {
    return {
      results: mockResults
        .map((result) => ({ ...result, run_id: id }))
        .filter((result) => !status || result.status === status),
      demo: true
    };
  }

  const supabase = getServiceSupabase();
  let query = supabase.from("attendance_results").select("*").eq("run_id", id).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return { results: data ?? [], demo: false };
}

export async function getAttendanceRecords() {
  if (!hasSupabaseEnv()) {
    return { records: mockWeeklyRecords, demo: true };
  }

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("attendance_weekly_records")
    .select("*")
    .order("target_week", { ascending: false })
    .limit(200);
  return { records: data ?? [], demo: false };
}
