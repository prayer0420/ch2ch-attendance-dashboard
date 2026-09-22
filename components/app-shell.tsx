import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { AppNavigation } from "@/components/app-navigation";

function LogoutButton() {
  return <form action="/api/auth/logout" method="post">
    <button className="focus-ring flex min-h-11 items-center gap-2 rounded px-3 text-sm font-bold text-ink/65 hover:bg-white" type="submit"><LogOut size={16} aria-hidden="true" />로그아웃</button>
  </form>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="focus-ring sr-only z-50 bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">본문으로 이동</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-line/80 bg-paper/95 px-4 py-5 backdrop-blur lg:flex">
        <Link href="/" className="focus-ring flex items-center gap-3 border-b border-line pb-5">
          <span className="grid size-10 place-items-center rounded bg-ink text-paper"><Activity size={20} aria-hidden="true" /></span>
          <span><span className="block font-display text-xl font-bold">CH2CH</span><span className="text-xs text-ink/60">출석체크 관리</span></span>
        </Link>
        <AppNavigation />
        <div className="mt-auto space-y-3 pt-8">
          <p className="rounded border border-line bg-white/65 p-3 text-xs leading-5 text-ink/60">출석과 예배일지에는 개인정보가 포함됩니다. 공용 기기에서는 사용 후 로그아웃해 주세요.</p>
          <LogoutButton />
        </div>
      </aside>
      <header className="flex min-h-16 items-center justify-between gap-2 border-b border-line bg-paper/95 px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Link href="/" aria-label="CH2CH 대시보드" className="focus-ring inline-flex min-h-11 items-center gap-2 font-display text-xl font-bold"><Activity size={20} aria-hidden="true" />CH2CH</Link>
        <LogoutButton />
      </header>
      <main id="main-content" tabIndex={-1} className="min-h-screen min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64"><div className="mx-auto min-w-0 max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">{children}</div></main>
      <AppNavigation mobile />
    </div>
  );
}
