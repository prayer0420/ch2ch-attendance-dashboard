import Link from "next/link";
import { ClipboardCopy, Play, QrCode, RefreshCw, UserRoundSearch } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { getDashboardData } from "@/lib/data";
import { isRunnerOnline, resultStatusLabel, runStatusLabel, statusTone } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const { runs, latestRun, failures, heartbeat, demo } = await getDashboardData();
  const online = isRunnerOnline(heartbeat?.last_seen_at);
  return <AppShell>
    <SectionTitle eyebrow={demo ? "로컬 미리보기" : "운영 화면"} title="출석체크 대시보드">
      <div className="flex flex-wrap gap-2">
        <Link className="focus-ring inline-flex items-center gap-2 rounded border border-sea/35 bg-sea/10 px-4 py-2 text-sm font-bold text-sea" href="/qr-attendance"><QrCode size={16} />QR 출석체크</Link>
        <Link className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold text-ink" href="/search"><UserRoundSearch size={16} />교인 검색</Link>
        <Link className="focus-ring inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-bold text-paper" href="/runs/new"><Play size={16} />출석 실행 만들기</Link>
      </div>
    </SectionTitle>
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]"><div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="총 대상" value={latestRun?.total_count ?? 0} tone="sea" /><StatCard label="1차 성공" value={latestRun?.primary_success_count ?? 0} tone="moss" /><StatCard label="2차 성공" value={latestRun?.second_pass_success_count ?? 0} tone="brass" /><StatCard label="최종 실패" value={latestRun?.final_fail_count ?? 0} tone="brick" /><StatCard label="저장 실패" value={latestRun?.save_fail_count ?? 0} tone="brick" /></div><Panel><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">최근 실행</h2><RefreshCw size={17} className="text-ink/45" /></div>{runs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead className="border-b border-line text-left text-xs text-ink/50"><tr><th className="py-2">주차</th><th>상태</th><th>진행</th><th>1차/2차</th><th>실패</th><th>요청 시간</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-b border-line/70"><td className="py-3 font-bold"><Link href={`/runs/${run.id}`}>{run.target_week_text ?? `${run.target_week}주차`}</Link></td><td><Badge tone={statusTone(run.status)}>{runStatusLabel(run.status)}</Badge></td><td>{run.processed_count} / {run.total_count}</td><td>{run.primary_success_count} / {run.second_pass_success_count}</td><td className="text-brick">{run.final_fail_count + run.save_fail_count}</td><td>{formatDateTime(run.requested_at)}</td></tr>)}</tbody></table></div> : <EmptyState>아직 실행 기록이 없습니다.</EmptyState>}</Panel></div><div className="grid content-start gap-4"><Panel><h2 className="mb-3 text-lg font-black">로컬 실행 상태</h2><Badge tone={online ? "good" : "bad"}>{online ? "온라인" : "오프라인"}</Badge><p className="mt-4 rounded border border-line bg-white/60 p-3 text-sm text-ink/65">DB 연결 없이 샘플 데이터로 동작합니다. 실행 결과는 새로고침하면 초기화됩니다.</p></Panel><Panel><div className="mb-3 flex items-center gap-2"><ClipboardCopy size={17} /><h2 className="text-lg font-black">최근 실패</h2></div>{failures.length ? <div className="grid gap-2 text-sm">{failures.map((failure) => <div key={failure.id} className="rounded border border-brick/25 bg-brick/5 p-3"><p className="font-bold">{failure.name}</p><p className="mt-1 text-xs text-brick">{resultStatusLabel(failure.status)} · {failure.failure_reason ?? "사유 없음"}</p></div>)}</div> : <EmptyState>최근 실행에 실패 항목이 없습니다.</EmptyState>}</Panel></div></div>
  </AppShell>;
}
