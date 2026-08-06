import { mockEvents, mockResults, mockRun, mockRuns, mockWeeklyRecords, mockHeartbeat } from "./mock-data";

export async function getDashboardData() {
  return {
    runs: mockRuns,
    latestRun: mockRuns[0],
    failures: mockResults.filter((result) => ["final_fail", "save_failed"].includes(result.status)),
    heartbeat: mockHeartbeat,
    demo: true
  };
}

export async function getRunDetail(id: string) {
  return {
    run: { ...mockRun, id },
    results: mockResults.map((result) => ({ ...result, run_id: id })),
    events: mockEvents.map((event) => ({ ...event, run_id: id })),
    demo: true
  };
}

export async function getRunResults(id: string, status?: string) {
  return {
    results: mockResults
      .map((result) => ({ ...result, run_id: id }))
      .filter((result) => !status || result.status === status),
    demo: true
  };
}

export async function getAttendanceRecords() {
  return { records: mockWeeklyRecords, demo: true };
}
