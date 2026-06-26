"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export function PageActions() {
  const router = useRouter();

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white/80 px-3 py-2 text-sm font-bold text-ink"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} />
        뒤로가기
      </button>
      <Link
        className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white/80 px-3 py-2 text-sm font-bold text-ink"
        href="/"
      >
        <Home size={16} />
        홈
      </Link>
    </div>
  );
}
