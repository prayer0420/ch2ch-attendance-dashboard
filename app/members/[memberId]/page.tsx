import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { getAttendanceRecords } from "@/lib/data";

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const { records } = await getAttendanceRecords();
  const record = records.find((item) => item.id === memberId);
  const memberRecords = record ? records.filter((item) => item.normalized_name === record.normalized_name) : [];

  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="사람 상세" title={record?.member_name ?? "사람별 상세"} />
      {record ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="현재 가족" value={record.family ?? "-"} tone="sea" />
            <StatCard label="1-3부 참석" value={memberRecords.filter((item) => item.service_1_3_present).length} tone="moss" />
            <StatCard label="4부 참석" value={memberRecords.filter((item) => item.service_4_present).length} tone="brass" />
          </div>
          <Panel>
            {memberRecords.map((item) => (
              <div key={item.id} className="border-b border-line py-3 text-sm">
                <p className="font-bold">{item.target_week_text} · {item.family}</p>
                <p className="text-ink/60">발견 위치: {item.found_location ?? "-"} / 실패 사유: {item.failure_reason ?? "-"}</p>
              </div>
            ))}
          </Panel>
        </>
      ) : <EmptyState>사람 기록을 찾을 수 없습니다.</EmptyState>}
    </AppShell>
  );
}
