"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AutoRefresh({ enabled = true, seconds = 5 }: { enabled?: boolean; seconds?: number }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    if (!enabled) return;

    const tick = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) return 0;
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [enabled, router, seconds]);

  useEffect(() => {
    if (!enabled || countdown !== 0) return;
    router.refresh();
    setCountdown(seconds);
  }, [countdown, enabled, router, seconds]);

  if (!enabled) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded border border-line bg-white/80 px-3 py-2 text-xs font-bold text-ink/65">
      <RefreshCw size={14} />
      {countdown}초 뒤 자동 새로고침
    </div>
  );
}
