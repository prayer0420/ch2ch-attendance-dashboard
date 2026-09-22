"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, Home, Play, QrCode, Settings, UserRoundSearch } from "lucide-react";

const items = [
  { href: "/", label: "대시보드", short: "홈", icon: Home },
  { href: "/search", label: "교인 검색", short: "교인 검색", icon: UserRoundSearch },
  { href: "/qr-attendance", label: "QR 출석체크", short: "QR 체크", icon: QrCode },
  { href: "/runs/new", label: "출석 실행", short: "출석 실행", icon: Play },
  { href: "/worship-journal", label: "예배일지", short: "예배일지", icon: BookOpenCheck },
  { href: "/settings", label: "설정", short: "설정", icon: Settings }
];

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label={mobile ? "모바일 주요 메뉴" : "주요 메뉴"} className={mobile
    ? "fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-line bg-paper/95 px-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
    : "mt-6 grid gap-1"}>
    {(mobile ? items.slice(1) : items).map(item => {
      const active = item.href === "/runs/new" ? pathname.startsWith("/runs") || pathname === "/attendance" : pathname === item.href;
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} aria-label={item.label}
        className={`focus-ring flex min-h-12 rounded-lg font-bold transition ${mobile ? "flex-col items-center justify-center gap-1 px-1 text-[11px]" : "items-center gap-3 px-3 py-3 text-sm"} ${active ? "bg-sea text-white shadow-sm" : "text-ink/70 hover:bg-white hover:text-ink"}`}>
        <item.icon size={18} aria-hidden="true" />{mobile ? item.short : item.label}
      </Link>;
    })}
  </nav>;
}
