export type RunStatus =
  | "queued"
  | "picked_up"
  | "running"
  | "saving"
  | "completed"
  | "partial_success"
  | "failed"
  | "cancelled"
  | "dry_run_completed";

export type ResultStatus =
  | "primary_success"
  | "second_pass_success"
  | "final_fail"
  | "save_failed"
  | "skipped"
  | "dry_run";

export type AttendanceRun = {
  id: string;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: RunStatus;
  data_source: string;
  google_sheet_url: string | null;
  google_sheet_tab: string | null;
  target_dept: string | null;
  target_term: string | null;
  target_group: string | null;
  target_year?: number | null;
  target_date?: string | null;
  target_week: number | null;
  target_week_text: string | null;
  dry_run: boolean;
  enable_second_pass: boolean;
  enable_new_family_groups: boolean;
  enable_long_absence_search: boolean;
  total_count: number;
  processed_count: number;
  primary_success_count: number;
  primary_fail_count: number;
  second_pass_success_count: number;
  final_fail_count: number;
  save_success_count: number;
  save_fail_count: number;
  current_family: string | null;
  current_name: string | null;
  current_step: string | null;
  runner_id: string | null;
  runner_hostname: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendanceResult = {
  id: string;
  run_id: string;
  name: string;
  normalized_name: string;
  original_family: string | null;
  found_location: string | null;
  target_week: number | null;
  target_week_text: string | null;
  service_1_3_present: boolean;
  service_4_present: boolean;
  memo: string | null;
  status: ResultStatus;
  attempt_stage: string | null;
  save_result: string | null;
  failure_reason: string | null;
  checked_at: string | null;
  created_at: string;
};

export type RunEvent = {
  id: number;
  run_id: string | null;
  level: "info" | "warn" | "error" | "debug";
  event_type: string | null;
  message: string;
  context: Record<string, unknown> | null;
  created_at: string;
};

export type WeeklyRecord = {
  id: string;
  member_name: string;
  normalized_name: string;
  family: string | null;
  found_location: string | null;
  target_year: number | null;
  target_term: string | null;
  target_week: number;
  target_week_text: string | null;
  service_1_3_present: boolean;
  service_4_present: boolean;
  status: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type RunnerHeartbeat = {
  id: string;
  runner_id: string;
  hostname: string | null;
  status: string;
  last_seen_at: string;
  current_run_id: string | null;
  current_step: string | null;
};
