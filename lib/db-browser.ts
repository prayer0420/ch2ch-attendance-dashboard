import { mockEvents, mockHeartbeat, mockResults, mockRuns, mockWeeklyRecords } from "@/lib/mock-data";
import { getServiceSupabase, hasSupabaseEnv } from "@/lib/supabase/server";

export type DbTableName =
  | "attendance_runs"
  | "run_events"
  | "attendance_results"
  | "runner_heartbeats"
  | "attendance_weekly_records"
  | "attendance_members"
  | "app_settings";

type DbTableConfig = {
  name: DbTableName;
  label: string;
  description: string;
  orderBy: string;
  ascending?: boolean;
};

export const DB_TABLES: DbTableConfig[] = [
  {
    name: "attendance_runs",
    label: "실행 요청",
    description: "출석체크 실행 단위와 진행 상태",
    orderBy: "requested_at"
  },
  {
    name: "run_events",
    label: "실시간 로그",
    description: "Runner와 자동화가 남긴 이벤트 로그",
    orderBy: "created_at"
  },
  {
    name: "attendance_results",
    label: "사람별 결과",
    description: "각 이름의 체크 성공, 실패, 저장 결과",
    orderBy: "created_at"
  },
  {
    name: "runner_heartbeats",
    label: "Runner 상태",
    description: "로컬 Runner 연결 상태",
    orderBy: "last_seen_at"
  },
  {
    name: "attendance_weekly_records",
    label: "주차별 기록",
    description: "저장 확인된 주차별 출석 기록",
    orderBy: "created_at"
  },
  {
    name: "attendance_members",
    label: "구성원",
    description: "이름과 가족 기준 구성원 데이터",
    orderBy: "updated_at"
  },
  {
    name: "app_settings",
    label: "앱 설정",
    description: "홈페이지 설정값",
    orderBy: "key",
    ascending: true
  }
];

const MOCK_TABLE_DATA: Record<DbTableName, Array<Record<string, unknown>>> = {
  attendance_runs: mockRuns as unknown as Array<Record<string, unknown>>,
  run_events: mockEvents as unknown as Array<Record<string, unknown>>,
  attendance_results: mockResults as unknown as Array<Record<string, unknown>>,
  runner_heartbeats: [mockHeartbeat] as unknown as Array<Record<string, unknown>>,
  attendance_weekly_records: mockWeeklyRecords as unknown as Array<Record<string, unknown>>,
  attendance_members: [],
  app_settings: []
};

export function getDbTableConfig(tableName?: string | null) {
  return DB_TABLES.find((table) => table.name === tableName) ?? DB_TABLES[0];
}

export async function getDbTableRows(tableName?: string | null, limit = 100) {
  const table = getDbTableConfig(tableName);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 10), 500);

  if (!hasSupabaseEnv()) {
    const rows = MOCK_TABLE_DATA[table.name].slice(0, safeLimit);
    return {
      table,
      rows,
      count: MOCK_TABLE_DATA[table.name].length,
      demo: true
    };
  }

  const supabase = getServiceSupabase();
  const { count, error: countError } = await supabase
    .from(table.name)
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabase
    .from(table.name)
    .select("*")
    .order(table.orderBy, { ascending: table.ascending ?? false })
    .limit(safeLimit);
  if (error) throw new Error(error.message);

  return {
    table,
    rows: (data ?? []) as Array<Record<string, unknown>>,
    count: count ?? data?.length ?? 0,
    demo: false
  };
}
