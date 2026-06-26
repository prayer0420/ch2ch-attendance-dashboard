import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { Badge, EmptyState, Panel, SectionTitle } from "@/components/ui";
import { getRunResults } from "@/lib/data";
import { resultStatusLabel, saveResultLabel, statusTone } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

const filters = [
  ["", "전체"],
  ["primary_success", "1차 성공"],
  ["second_pass_success", "2차 성공"],
  ["final_fail", "최종 실패"],
  ["save_failed", "저장 실패"],
  ["dry_run", "테스트 결과"]
];

export default async function RunResultsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const { id } = await params;
  const { status } = await searchParams;
  const { results } = await getRunResults(id, status);

  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="결과 표" title="실행 결과 목록" />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link key={value} href={value ? `/runs/${id}/results?status=${value}` : `/runs/${id}/results`} className="focus-ring rounded border border-line bg-white/75 px-3 py-2 text-sm font-bold">
            {label}
          </Link>
        ))}
      </div>
      <Panel>
        {results.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-[0.12em] text-ink/50">
                <tr>
                  <th className="py-2">상태</th><th>이름</th><th>원래 가족</th><th>발견 위치</th><th>주차</th><th>1-3부</th><th>4부</th><th>저장 결과</th><th>실패 사유</th><th>처리 시간</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b border-line/70">
                    <td className="py-3"><Badge tone={statusTone(result.status)}>{resultStatusLabel(result.status)}</Badge></td>
                    <td className="font-bold">{result.name}</td>
                    <td>{result.original_family ?? "-"}</td>
                    <td>{result.found_location ?? "-"}</td>
                    <td>{result.target_week_text ?? `${result.target_week}주`}</td>
                    <td>{result.service_1_3_present ? "O" : "X"}</td>
                    <td>{result.service_4_present ? "O" : "X"}</td>
                    <td>{saveResultLabel(result.save_result)}</td>
                    <td className="text-brick">{result.failure_reason ?? "-"}</td>
                    <td>{formatDateTime(result.checked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>조건에 맞는 결과가 없습니다.</EmptyState>}
      </Panel>
    </AppShell>
  );
}
