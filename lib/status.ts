import type { ResultStatus, RunStatus } from "./types";

export function runStatusLabel(status: RunStatus | string) {
  const labels: Record<string, string> = {
    queued: "대기 중",
    picked_up: "Runner 접수",
    running: "실행 중",
    saving: "저장 중",
    completed: "완료",
    partial_success: "일부 실패/확인 필요",
    failed: "실패",
    cancelled: "취소됨",
    dry_run_completed: "테스트 완료"
  };
  return labels[status] ?? status;
}

export function resultStatusLabel(status: ResultStatus | string) {
  const labels: Record<string, string> = {
    primary_success: "1차 성공",
    second_pass_success: "2차 성공",
    final_fail: "최종 실패",
    save_failed: "저장 실패",
    skipped: "건너뜀",
    dry_run: "테스트 결과"
  };
  return labels[status] ?? status;
}

export function saveResultLabel(value?: string | null) {
  const labels: Record<string, string> = {
    success: "저장 확인",
    failed: "저장 실패",
    not_saved: "저장 안 함",
    attempted_unverified: "저장 시도 - 확인 필요"
  };
  return value ? labels[value] ?? value : "-";
}

export function statusTone(status?: string | null): "default" | "good" | "warn" | "bad" {
  if (!status) return "default";
  if (["completed", "dry_run_completed", "primary_success", "second_pass_success"].includes(status)) return "good";
  if (["queued", "picked_up", "running", "saving", "dry_run", "partial_success"].includes(status)) return "warn";
  if (status.includes("fail") || status === "failed") return "bad";
  return "default";
}

export function isRunnerOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 30_000;
}

export function normalizeName(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

export function nextActionForRun(status: RunStatus | string, hasEvents: boolean) {
  if (status === "queued") {
    return hasEvents
      ? "Runner가 곧 가져갈 예정입니다. 화면을 잠시 뒤 새로고침해 주세요."
      : "아직 Runner가 요청을 가져가지 않았습니다. start-local.cmd를 실행했는지, Runner 창에 오류가 없는지 확인하세요.";
  }
  if (status === "picked_up") return "Runner가 요청을 접수했습니다. 곧 실행 중으로 바뀝니다.";
  if (status === "running") return "Runner가 처리 중입니다. 현재 가족/이름과 로그를 확인하세요.";
  if (status === "saving") return "결과를 저장하는 중입니다.";
  if (status === "dry_run_completed") return "테스트 실행이 끝났습니다. 결과를 확인한 뒤 실제 실행을 진행하세요.";
  if (status === "completed") return "실행이 완료되었습니다. 실패자와 출석 이력을 확인하세요.";
  if (status === "partial_success") return "일부 실패가 있거나 CH2CH 저장 완료 확인이 필요합니다. 결과와 실시간 로그를 확인하세요.";
  if (status === "failed") return "실행이 실패했습니다. 오른쪽 로그와 오류 메시지를 확인하세요.";
  return "상태를 확인하세요.";
}
