"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Square } from "lucide-react";

export function RunStopButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function stopRun() {
    if (!window.confirm("현재 실행을 중지할까요? 진행 중인 웹교적 작업도 중단됩니다.")) return;
    setStopping(true);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "실행 중지에 실패했습니다.");
      router.refresh();
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "실행 중지에 실패했습니다.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-1">
      <button
        type="button"
        onClick={stopRun}
        disabled={stopping}
        className="focus-ring inline-flex items-center gap-2 rounded border border-brick/45 bg-brick/10 px-4 py-2 text-sm font-black text-brick disabled:opacity-50"
      >
        <Square size={15} fill="currentColor" />
        {stopping ? "중지 요청 중..." : "실행 중지"}
      </button>
      {error ? <span className="text-xs font-bold text-brick">{error}</span> : null}
    </div>
  );
}
