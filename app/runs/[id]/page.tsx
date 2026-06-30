import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageActions } from "@/components/page-actions";
import { Badge, EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { getRunDetail } from "@/lib/data";
import { nextActionForRun, resultStatusLabel, runStatusLabel, saveResultLabel, statusTone } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

type FamilySummary = {
  family: string;
  sunday: number;
  department: number;
  success: number;
  failed: number;
  saveSuccess: number;
  saveFailed: number;
  corrected: string[];
  failedNames: string[];
};

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run, results, events, demo } = await getRunDetail(id);

  if (!run) {
    return (
      <AppShell>
        <PageActions />
        <EmptyState>실행을 찾을 수 없습니다.</EmptyState>
      </AppShell>
    );
  }

  const percent = run.total_count ? Math.round((run.processed_count / run.total_count) * 100) : 0;
  const failures = results.filter((result) => ["final_fail", "save_failed"].includes(result.status));
  const nextAction = nextActionForRun(run.status, events.length > 0);
  const familySummary = Array.from(results.reduce<Map<string, FamilySummary>>((map, result) => {
    const key = result.original_family || result.found_location || "미확인";
    const current = map.get(key) ?? {
      family: key,
      sunday: 0,
      department: 0,
      success: 0,
      failed: 0,
      saveSuccess: 0,
      saveFailed: 0,
      corrected: [] as string[],
      failedNames: [] as string[]
    };

    if (result.service_1_3_present) current.sunday += 1;
    if (result.service_4_present) current.department += 1;
    if (["primary_success", "second_pass_success", "dry_run"].includes(result.status)) current.success += 1;
    if (["final_fail", "save_failed"].includes(result.status)) {
      current.failed += 1;
      current.failedNames.push(result.name);
    }
    if (result.save_result === "success") current.saveSuccess += 1;
    if (result.save_result === "failed") current.saveFailed += 1;
    if (result.status === "second_pass_success") current.corrected.push(result.name);
    map.set(key, current);
    return map;
  }, new Map<string, FamilySummary>()).values());

  const targetText = (result: typeof results[number]) => {
    const targets = [];
    if (result.service_1_3_present) targets.push("주일");
    if (result.service_4_present) targets.push("부서");
    return targets.length ? targets.join(", ") : "-";
  };

  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow={demo ? "데모 화면" : "실행 상세"} title={`${run.target_week_text ?? `${run.target_week}주`} 진행상황`}>
        <div className="flex flex-wrap gap-2">
          <AutoRefresh enabled={["queued", "picked_up", "running", "saving"].includes(run.status)} />
          <Link className="focus-ring rounded bg-ink px-4 py-2 text-sm font-bold text-paper" href={`/runs/${id}/results`}>결과 전체 보기</Link>
        </div>
      </SectionTitle>

      {run.dry_run ? (
        <div className="mb-4 rounded border border-sea/35 bg-sea/10 p-3 text-sm font-bold text-sea">
          테스트 실행입니다. CH2CH에 실제 저장하지 않습니다.
        </div>
      ) : null}

      <div className="mb-4 rounded border border-brass/35 bg-brass/10 p-4 text-sm text-ink">
        <p className="font-black">지금 상태: {runStatusLabel(run.status)}</p>
        <p className="mt-1">{nextAction}</p>
        {run.status === "queued" ? (
          <p className="mt-2 text-brick">대기 중에서 계속 멈춰 있으면 프로젝트 폴더의 <strong>start-local.cmd</strong>를 실행하고 Runner 창의 오류를 확인하세요.</p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <Badge tone={statusTone(run.status)}>{runStatusLabel(run.status)}</Badge>
              <span className="text-sm font-bold">{run.processed_count} / {run.total_count}명</span>
            </div>
            <div className="h-4 overflow-hidden rounded bg-ink/10">
              <div className="h-full bg-sea transition-all" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatCard label="현재 가족" value={run.current_family ?? "-"} tone="moss" />
              <StatCard label="현재 이름" value={run.current_name ?? "-"} tone="sea" />
              <StatCard label="현재 단계" value={run.current_step ?? "-"} tone="brass" />
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-5">
            <StatCard label="1차 성공" value={run.primary_success_count} tone="moss" />
            <StatCard label="2차 성공" value={run.second_pass_success_count} tone="brass" />
            <StatCard label="최종 실패" value={run.final_fail_count} tone="brick" />
            <StatCard label="저장 성공" value={run.save_success_count} tone="sea" />
            <StatCard label="저장 실패" value={run.save_fail_count} tone="brick" />
          </div>

          <Panel>
            <h2 className="mb-3 text-lg font-black">최종 가족별 결과</h2>
            {familySummary.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="border-b border-line text-left text-xs font-black text-ink/55">
                    <tr>
                      <th className="py-2">가족</th>
                      <th>주일</th>
                      <th>부서</th>
                      <th>성공</th>
                      <th>실패</th>
                      <th>저장</th>
                      <th>특이사항</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familySummary.map((family) => (
                      <tr key={family.family} className="border-b border-line/70 align-top">
                        <td className="py-3 font-black">{family.family}</td>
                        <td>{family.sunday}명</td>
                        <td>{family.department}명</td>
                        <td className="font-bold text-moss">{family.success}명</td>
                        <td className={family.failed ? "font-bold text-brick" : "text-ink/60"}>{family.failed}명</td>
                        <td>
                          {family.saveFailed ? (
                            <span className="font-bold text-brick">실패 {family.saveFailed}</span>
                          ) : family.saveSuccess ? (
                            <span className="font-bold text-sea">성공 {family.saveSuccess}</span>
                          ) : "-"}
                        </td>
                        <td className="max-w-[280px] text-xs leading-5 text-ink/65">
                          {family.corrected.length ? `검색 보정: ${family.corrected.join(", ")}` : null}
                          {family.failedNames.length ? `${family.corrected.length ? " / " : ""}실패: ${family.failedNames.join(", ")}` : null}
                          {!family.corrected.length && !family.failedNames.length ? "-" : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState>아직 결과가 없습니다. Runner가 실행을 시작하면 여기에 결과가 쌓입니다.</EmptyState>}
          </Panel>

          <Panel>
            <h2 className="mb-3 text-lg font-black">최근 처리 내역</h2>
            {results.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase tracking-[0.12em] text-ink/50">
                    <tr><th className="py-2">상태</th><th>이름</th><th>원래 가족</th><th>처리 위치</th><th>주일</th><th>부서</th><th>저장</th></tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 8).map((result) => (
                      <tr key={result.id} className="border-b border-line/70">
                        <td className="py-3"><Badge tone={statusTone(result.status)}>{resultStatusLabel(result.status)}</Badge></td>
                        <td className="font-bold">{result.name}</td>
                        <td>{result.original_family ?? "-"}</td>
                        <td>{result.found_location ?? "-"}</td>
                        <td>{result.service_1_3_present ? "O" : "X"}</td>
                        <td>{result.service_4_present ? "O" : "X"}</td>
                        <td>{saveResultLabel(result.save_result)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState>아직 결과가 없습니다. Runner가 실행을 시작하면 여기에 결과가 쌓입니다.</EmptyState>}
          </Panel>
        </div>

        <div className="grid content-start gap-4">
          <Panel>
            <h2 className="mb-3 text-lg font-black">실시간 로그</h2>
            {events.length ? (
              <div className="grid gap-2">
                {events.map((event) => (
                  <div key={event.id} className="rounded border border-line bg-white/70 p-3 text-sm">
                    <p className="font-bold">{event.message}</p>
                    <p className="mt-1 text-xs font-bold text-ink/50">{formatDateTime(event.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>아직 로그가 없습니다. Runner가 요청을 가져가면 첫 로그가 표시됩니다.</EmptyState>
            )}
          </Panel>
          <Panel>
            <h2 className="mb-3 text-lg font-black">최종 실패자</h2>
            {failures.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="border-b border-line text-left text-xs font-black text-ink/55">
                    <tr><th className="py-2">이름</th><th>가족</th><th>체크</th><th>원인</th></tr>
                  </thead>
                  <tbody>
                    {failures.map((failure) => (
                      <tr key={failure.id} className="border-b border-line/70 align-top">
                        <td className="py-3 font-black">{failure.name}</td>
                        <td>{failure.found_location || failure.original_family || "-"}</td>
                        <td>{targetText(failure)}</td>
                        <td className="text-brick">{failure.failure_reason ?? "사유 없음"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState>최종 실패자가 없습니다.</EmptyState>}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
