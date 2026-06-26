import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { Panel, SectionTitle } from "@/components/ui";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="기본값" title="설정" />
      <Panel className="max-w-2xl">
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-bold">구글시트 URL<input className="focus-ring rounded border border-line px-3 py-2" defaultValue="https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/edit?usp=drivesdk" /></label>
          <label className="grid gap-2 text-sm font-bold">탭 이름<input className="focus-ring rounded border border-line px-3 py-2" defaultValue="가장체크" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">부서<input className="focus-ring rounded border border-line px-3 py-2" defaultValue="2청년회" /></label>
            <label className="grid gap-2 text-sm font-bold">기본 주차<input className="focus-ring rounded border border-line px-3 py-2" defaultValue="24" type="number" /></label>
          </div>
          <button className="focus-ring rounded bg-ink px-4 py-2 font-bold text-paper">설정 저장</button>
        </div>
      </Panel>
    </AppShell>
  );
}
