const OPTIONAL_RUN_COLUMNS = [
  "source_file_path",
  "source_file_name",
  "source_file_type",
  "target_year",
  "target_date"
];

function isMissingColumnError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42703" || (
    message.includes("column") &&
    (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"))
  );
}

function stripOptionalRunColumns(payload) {
  const legacyPayload = { ...payload };
  for (const column of OPTIONAL_RUN_COLUMNS) delete legacyPayload[column];
  return legacyPayload;
}

module.exports = { isMissingColumnError, stripOptionalRunColumns };
