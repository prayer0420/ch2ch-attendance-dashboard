import { requirePageSession } from "@/lib/page-auth";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageActions } from "@/components/page-actions";
import { RunStopButton } from "@/components/run-stop-button";
import { Badge, EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { getRunDetail } from "@/lib/data";
import { summarizeRunResults } from "@/lib/run-summary";
import { nextActionForRun, runStatusLabel, statusTone } from "@/lib/status";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession();
  const { id } = await params;
  const { run, results, events, demo } = await getRunDetail(id);
  if (!run) {
    return <AppShell><PageActions /><EmptyState>실행을 찾을 수 없습니다.</EmptyState></AppShell>;
  }
  const percent = run.total_count ? Math.min(100, Math.round((run.processed_count / run.total_count) * 100)) : 0;
  const isFinished = ["completed", "partial_success", "failed", "cancelled", "dry_run_completed"].includes(run.status);
  const { families, totals } = summarizeRunResults(results, run.dry_run);
  const failedFamilies = families.filter((family) => family.failed > 0);
  const successLabel = run.dry_run ? "테스트 통과" : "성공";

  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow={demo ? "데모 화면" : "출석 실행"} title={`${run.target_week_text ?? `${run.target_week}주`} 진행상황`}>
        <div className="flex flex-wrap gap-2">
          <AutoRefresh enabled={!isFinished} />
          {!isFinished ? <RunStopButton runId={id} /> : null}
          <Link className="focus-ring rounded bg-ink px-4 py-2 text-sm font-bold text-paper" href={`/runs/${id}/results`}>상세 결과 보기</Link>
        </div>
      </SectionTitle>
      {run.dry_run ? <p className="mb-4 rounded border border-sea/35 bg-sea/10 p-3 text-sm font-bold text-sea">테스트 실행입니다. CH2CH에 실제 저장하지 않습니다.</p> : null}
      <div className="grid gap-4">
        <Panel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Badge tone={statusTone(run.status)}>{runStatusLabel(run.status)}</Badge>
            <span className="text-sm font-bold">{run.processed_count} / {run.total_count}명 처리</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-ink/10" role="progressbar" aria-label="출석 처리 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full bg-sea transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-3 text-sm font-bold">
            {isFinished
              ? `${runStatusLabel(run.status)} · ${successLabel} ${totals.success}명 / 실패 ${totals.failed}명`
              : run.current_family ? `${run.current_family} 처리 중` : nextActionForRun(run.status, events.length > 0)}
          </p>
          {totals.unconfirmed > 0 ? <p className="mt-2 text-sm text-brick">저장 미확인 {totals.unconfirmed}명 — 성공 인원에 포함하지 않았습니다. 상세 결과를 확인해 주세요.</p> : null}
          {totals.skipped > 0 ? <p className="mt-2 text-sm text-ink/60">건너뜀 {totals.skipped}명</p> : null}
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={`${isFinished ? "최종" : "현재까지"} ${successLabel}`} value={`${totals.success}명`} tone="moss" />
          <StatCard label={`${isFinished ? "최종" : "현재까지"} 실패`} value={`${totals.failed}명`} tone="brick" />
        </div>
        <Panel>
          <h2 className="mb-3 text-lg font-black">{isFinished ? "최종 가족별 결과" : "가족별 진행 결과"}</h2>
          {families.length ? (
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs font-black text-ink/55">
                <tr><th className="py-2">가족</th><th className="text-right">{successLabel}</th><th className="text-right">실패</th></tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr key={family.family} className="border-b border-line/70">
                    <td className="py-3 pr-2 font-bold">
                      {family.family}
                      {family.unconfirmed > 0 ? <span className="mt-1 block text-xs font-normal text-brick">저장 미확인 {family.unconfirmed}명</span> : null}
                      {family.skipped > 0 ? <span className="mt-1 block text-xs font-normal text-ink/60">건너뜀 {family.skipped}명</span> : null}
                    </td>
                    <td className="whitespace-nowrap text-right font-bold text-moss">{family.success}명</td>
                    <td className={`whitespace-nowrap text-right ${family.failed ? "font-bold text-brick" : "text-ink/60"}`}>{family.failed}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState>아직 처리 결과가 없습니다.</EmptyState>}
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-black">실패자 명단 · {totals.failed}명</h2>
          {failedFamilies.length ? (
            <ul className="grid gap-3 text-sm">
              {failedFamilies.map((family) => (
                <li key={family.family} className="rounded border border-line p-3">
                  <p className="font-bold">{family.family} · {family.failed}명</p>
                  <p className="mt-1 break-words leading-6 text-brick">{family.failedNames.join(", ")}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState>{isFinished ? "기록된 실패자가 없습니다." : "현재까지 기록된 실패자가 없습니다."}</EmptyState>}
        </Panel>
      </div>
    </AppShell>
  );
}
