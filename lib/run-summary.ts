import type { AttendanceResult } from "./types";

export function summarizeRunResults(results: AttendanceResult[], dryRun: boolean) {
  const families = new Map<string, { family: string; success: number; failed: number; unconfirmed: number; skipped: number; failedNames: string[] }>();
  for (const result of results) {
    const family = result.original_family || result.found_location || "미확인";
    const summary = families.get(family) ?? { family, success: 0, failed: 0, unconfirmed: 0, skipped: 0, failedNames: [] };
    // Count people, not checkboxes; a successful click is not a verified save.
    if (result.status === "final_fail" || result.status === "save_failed" || result.save_result === "failed") {
      summary.failed += 1;
      summary.failedNames.push(result.name);
    } else if (result.status === "skipped") {
      summary.skipped += 1;
    } else if ((dryRun && result.status === "dry_run") || (["primary_success", "second_pass_success"].includes(result.status) && result.save_result === "success")) {
      summary.success += 1;
    } else {
      summary.unconfirmed += 1;
    }
    families.set(family, summary);
  }
  const rows = Array.from(families.values()).sort((a, b) => a.family.localeCompare(b.family, "ko"));
  const totals = rows.reduce((total, row) => ({
    success: total.success + row.success, failed: total.failed + row.failed,
    unconfirmed: total.unconfirmed + row.unconfirmed, skipped: total.skipped + row.skipped
  }), { success: 0, failed: 0, unconfirmed: 0, skipped: 0 });
  return { families: rows, totals };
}
