const assert = require("node:assert/strict");
const {
  isMissingColumnError,
  stripOptionalRunColumns
} = require("../lib/run-persistence");

const legacyError = {
  code: "42703",
  message: "column attendance_runs.source_file_path does not exist"
};
assert.equal(isMissingColumnError(legacyError), true);
assert.equal(isMissingColumnError({
  code: "PGRST204",
  message: "Could not find the 'source_file_name' column of 'attendance_runs' in the schema cache"
}), true);
assert.equal(isMissingColumnError({ code: "42501", message: "new row violates row-level security policy" }), false);

const modernPayload = {
  id: "run-1",
  csv_file_name: JSON.stringify({ path: "2026-08-09/run.csv", name: "run.csv", type: "csv" }),
  source_file_path: "2026-08-09/run.csv",
  source_file_name: "run.csv",
  source_file_type: "csv",
  target_year: 2026,
  target_date: "2026-08-09",
  target_week: 32
};
const legacyPayload = stripOptionalRunColumns(modernPayload);

assert.equal(legacyPayload.source_file_path, undefined);
assert.equal(legacyPayload.source_file_name, undefined);
assert.equal(legacyPayload.source_file_type, undefined);
assert.equal(legacyPayload.target_year, undefined);
assert.equal(legacyPayload.target_date, undefined);
assert.equal(legacyPayload.csv_file_name, modernPayload.csv_file_name);
assert.equal(legacyPayload.target_week, modernPayload.target_week);

console.log("run persistence compatibility checks passed");
