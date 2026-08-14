import Link from "next/link";
import { History } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { RunCreateForm } from "@/components/run-create-form";
import { SectionTitle } from "@/components/ui";

export default function NewRunPage() {
  return (
    <AppShell>
      <PageActions />
      <div className="mb-4 flex justify-end">
        <Link className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white/80 px-3 py-2 text-sm font-bold text-ink" href="/attendance">
          <History size={16} />
          출석 이력 보기
        </Link>
      </div>
      <SectionTitle eyebrow="새 실행 요청" title="출석체크 실행 만들기" />
      <RunCreateForm />
    </AppShell>
  );
}
