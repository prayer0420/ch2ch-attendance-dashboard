import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { RunCreateForm } from "@/components/run-create-form";
import { SectionTitle } from "@/components/ui";

export default function NewRunPage() {
  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="새 실행 요청" title="출석체크 실행 만들기" />
      <RunCreateForm />
    </AppShell>
  );
}
