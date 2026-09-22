import { requirePageSession } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { SectionTitle } from "@/components/ui";
import { AppSettings } from "@/components/app-settings";

export default async function SettingsPage() {
  await requirePageSession();
  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="기본값 · 앱 연결" title="설정" />
      <AppSettings />
    </AppShell>
  );
}
