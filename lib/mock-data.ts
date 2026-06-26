import type { AttendanceResult, AttendanceRun, RunEvent, RunnerHeartbeat, WeeklyRecord } from "./types";

const now = new Date().toISOString();

export const mockRun: AttendanceRun = {
  id: "demo-run-24",
  requested_at: now,
  started_at: now,
  finished_at: null,
  status: "running",
  data_source: "google_sheet",
  google_sheet_url: "https://docs.google.com/spreadsheets/d/demo/edit",
  google_sheet_tab: "가장체크",
  target_dept: "2청년회",
  target_term: null,
  target_group: null,
  target_week: 24,
  target_week_text: "24주",
  dry_run: true,
  enable_second_pass: true,
  enable_new_family_groups: true,
  enable_long_absence_search: true,
  total_count: 283,
  processed_count: 178,
  primary_success_count: 166,
  primary_fail_count: 12,
  second_pass_success_count: 10,
  final_fail_count: 2,
  save_success_count: 176,
  save_fail_count: 0,
  current_family: "시트 예시 가족",
  current_name: "시트 예시 이름",
  current_step: "테스트 결과 생성 중",
  runner_id: "main-office-pc",
  runner_hostname: "office-pc",
  error_message: null,
  created_at: now,
  updated_at: now
};

export const mockRuns: AttendanceRun[] = [
  mockRun,
  {
    ...mockRun,
    id: "demo-run-23",
    status: "completed",
    target_week: 23,
    target_week_text: "23주",
    processed_count: 279,
    total_count: 279,
    primary_success_count: 262,
    second_pass_success_count: 15,
    final_fail_count: 2,
    finished_at: now
  }
];

export const mockResults: AttendanceResult[] = [
  {
    id: "result-1",
    run_id: "demo-run-24",
    name: "시트 예시 1",
    normalized_name: "시트예시1",
    original_family: "예시 가족",
    found_location: "예시 가족",
    target_week: 24,
    target_week_text: "24주",
    service_1_3_present: true,
    service_4_present: true,
    memo: null,
    status: "primary_success",
    attempt_stage: "primary",
    save_result: "success",
    failure_reason: null,
    checked_at: now,
    created_at: now
  },
  {
    id: "result-2",
    run_id: "demo-run-24",
    name: "시트 예시 2",
    normalized_name: "시트예시2",
    original_family: "예시 가족",
    found_location: "예시 가족",
    target_week: 24,
    target_week_text: "24주",
    service_1_3_present: true,
    service_4_present: false,
    memo: null,
    status: "dry_run",
    attempt_stage: "sheet_preview",
    save_result: "not_saved",
    failure_reason: null,
    checked_at: now,
    created_at: now
  },
  {
    id: "result-3",
    run_id: "demo-run-24",
    name: "시트 예시 3",
    normalized_name: "시트예시3",
    original_family: "예시 가족",
    found_location: "예시 가족",
    target_week: 24,
    target_week_text: "24주",
    service_1_3_present: true,
    service_4_present: true,
    memo: null,
    status: "dry_run",
    attempt_stage: "sheet_preview",
    save_result: "not_saved",
    failure_reason: null,
    checked_at: now,
    created_at: now
  }
];

export const mockEvents: RunEvent[] = [
  { id: 1, run_id: "demo-run-24", level: "info", event_type: "runner_picked_up", message: "Runner가 실행 요청을 가져감", context: null, created_at: now },
  { id: 2, run_id: "demo-run-24", level: "info", event_type: "login_success", message: "CH2CH 로그인 성공", context: null, created_at: now },
  { id: 3, run_id: "demo-run-24", level: "info", event_type: "week_selected", message: "24주 선택 성공", context: null, created_at: now },
  { id: 4, run_id: "demo-run-24", level: "info", event_type: "sheet_read_completed", message: "구글시트에서 예시 데이터를 읽었습니다.", context: null, created_at: now }
];

export const mockHeartbeat: RunnerHeartbeat = {
  id: "heartbeat-1",
  runner_id: "main-office-pc",
  hostname: "office-pc",
  status: "online",
  last_seen_at: now,
  current_run_id: "demo-run-24",
  current_step: "테스트 결과 생성 중"
};

export const mockWeeklyRecords: WeeklyRecord[] = mockResults.map((result) => ({
  id: `weekly-${result.id}`,
  member_name: result.name,
  normalized_name: result.normalized_name,
  family: result.original_family,
  found_location: result.found_location,
  target_year: 2026,
  target_term: null,
  target_week: 24,
  target_week_text: "24주",
  service_1_3_present: result.service_1_3_present,
  service_4_present: result.service_4_present,
  status: result.status,
  failure_reason: result.failure_reason,
  created_at: now,
  updated_at: now
}));
