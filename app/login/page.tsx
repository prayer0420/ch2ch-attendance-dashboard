import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { Panel, SectionTitle } from "@/components/ui";

export default function LoginPage() {
  return (
    <AppShell>
      <PageActions />
      <SectionTitle eyebrow="관리자 인증" title="로그인" />
      <Panel className="max-w-md">
        <form className="grid gap-3">
          <input className="focus-ring rounded border border-line px-3 py-2" type="email" placeholder="관리자 이메일" />
          <input className="focus-ring rounded border border-line px-3 py-2" type="password" placeholder="비밀번호" />
          <button className="focus-ring rounded bg-ink px-4 py-2 font-bold text-paper">로그인</button>
        </form>
        <p className="mt-4 text-sm text-ink/60">Supabase Auth 연결 후 허용된 관리자 이메일만 접근하도록 확장합니다.</p>
      </Panel>
    </AppShell>
  );
}
