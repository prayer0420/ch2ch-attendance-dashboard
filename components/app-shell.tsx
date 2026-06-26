import Link from "next/link";
import { Activity, Database, Home, Play, Search, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: Home },
  { href: "/runs/new", label: "실행 만들기", icon: Play },
  { href: "/attendance", label: "출석 이력", icon: Search },
  { href: "/settings", label: "설정", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 border-r border-line/80 bg-paper/92 px-4 py-5 backdrop-blur lg:block">
        <Link href="/" className="flex items-center gap-3 border-b border-line pb-5">
          <span className="grid size-10 place-items-center rounded bg-ink text-paper">
            <Activity size={20} />
          </span>
          <span>
            <span className="block font-display text-xl font-bold">CH2CH</span>
            <span className="text-xs text-ink/60">출석체크 관리실</span>
          </span>
        </Link>
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-ink/72 transition hover:bg-white/70 hover:text-ink"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 border-t border-line pt-4 text-xs leading-5 text-ink/60">
          <Database className="mb-2" size={16} />
          홈페이지는 요청과 결과 확인만 담당합니다. 실제 CH2CH 클릭과 저장은 로컬 Runner가 처리합니다.
        </div>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
