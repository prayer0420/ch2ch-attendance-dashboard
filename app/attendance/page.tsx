import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { Badge, EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { getAttendanceRecords } from "@/lib/data";
import { resultStatusLabel, statusTone } from "@/lib/status";

export default async function AttendancePage() {
  const { records, demo } = await getAttendanceRecords();
  const service13 = records.filter((record) => record.service_1_3_present).length;
  const service4 = records.filter((record) => record.service_4_present).length;
  const failures = records.filter((record) => ["final_fail", "save_failed"].includes(record.status ?? "")).length;

  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow={demo ? "데모 화면" : "주차별 기록"} title="출석 이력 조회" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="1-3부 참석" value={service13} tone="moss" />
        <StatCard label="4부 참석" value={service4} tone="sea" />
        <StatCard label="실패 기록" value={failures} tone="brick" />
      </div>
      <Panel>
        <form className="mb-4 grid gap-3 md:grid-cols-5">
          <input className="focus-ring rounded border border-line px-3 py-2" name="week" placeholder="주차" />
          <input className="focus-ring rounded border border-line px-3 py-2" name="family" placeholder="가족" />
          <input className="focus-ring rounded border border-line px-3 py-2" name="name" placeholder="이름" />
          <select className="focus-ring rounded border border-line px-3 py-2" name="service">
            <option value="">전체 예배</option>
            <option value="1-3">1-3부 참석</option>
            <option value="4">4부 참석</option>
          </select>
          <button className="focus-ring rounded bg-ink px-4 py-2 font-bold text-paper">검색</button>
        </form>
        {records.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-[0.12em] text-ink/50">
                <tr><th className="py-2">주차</th><th>가족</th><th>이름</th><th>발견 위치</th><th>1-3부</th><th>4부</th><th>상태</th></tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-line/70">
                    <td className="py-3 font-bold">{record.target_week_text ?? `${record.target_week}주`}</td>
                    <td><Link href={`/families/${encodeURIComponent(record.family ?? "unknown")}`}>{record.family ?? "-"}</Link></td>
                    <td><Link className="font-bold" href={`/members/${record.id}`}>{record.member_name}</Link></td>
                    <td>{record.found_location ?? "-"}</td>
                    <td>{record.service_1_3_present ? "O" : "X"}</td>
                    <td>{record.service_4_present ? "O" : "X"}</td>
                    <td><Badge tone={statusTone(record.status)}>{record.status ? resultStatusLabel(record.status) : "-"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>조회 가능한 출석 이력이 없습니다.</EmptyState>}
      </Panel>
    </AppShell>
  );
}
