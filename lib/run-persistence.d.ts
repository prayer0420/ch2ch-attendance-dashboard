export function isMissingColumnError(error: unknown): boolean;
export function stripOptionalRunColumns<T extends Record<string, unknown>>(payload: T): Omit<T, "source_file_path" | "source_file_name" | "source_file_type" | "target_year" | "target_date">;
