import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import { getAttendanceRecords } from "@/lib/data";

export default async function FamilyPage({ params }: { params: Promise<{ familyName: string }> }) {
  const { familyName } = await params;
  const decoded = decodeURIComponent(familyName);
  const { records } = await getAttendanceRecords();
  const familyRecords = records.filter((record) => record.family === decoded);

  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="가족 상세" title={`${decoded} 출석 현황`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="기록 수" value={familyRecords.length} tone="sea" />
        <StatCard label="1-3부" value={familyRecords.filter((record) => record.service_1_3_present).length} tone="moss" />
        <StatCard label="4부" value={familyRecords.filter((record) => record.service_4_present).length} tone="brass" />
      </div>
      <Panel>
        {familyRecords.length ? familyRecords.map((record) => (
          <div key={record.id} className="border-b border-line py-3 text-sm">
            <p className="font-bold">{record.member_name} · {record.target_week_text}</p>
            <p className="text-ink/60">1-3부 {record.service_1_3_present ? "참석" : "미참석"} / 4부 {record.service_4_present ? "참석" : "미참석"}</p>
          </div>
        )) : <EmptyState>해당 가족의 기록이 없습니다.</EmptyState>}
      </Panel>
    </AppShell>
  );
}
