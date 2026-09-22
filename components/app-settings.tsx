"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Save } from "lucide-react";
import { DEFAULT_ATTENDANCE_SHEET_URL, ATTENDANCE_SHEET_STORAGE_KEY, isAttendanceSheetUrl, readAttendanceSheetUrl } from "@/lib/attendance-sheet-preference";
import { Panel } from "@/components/ui";
import { AppInstallCard } from "@/components/app-install";

export function AppSettings() {
  const [url, setUrl] = useState(DEFAULT_ATTENDANCE_SHEET_URL);
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => { setUrl(readAttendanceSheetUrl()); }, []);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!isAttendanceSheetUrl(url)) { setMessage("올바른 Google 스프레드시트 URL을 입력해 주세요."); return; }
    try {
      // Unlike automatic preference updates, an explicit save must report storage failures.
      localStorage.setItem(ATTENDANCE_SHEET_STORAGE_KEY, url.trim());
      setMessage("저장했습니다. QR 출석·출석 실행·예배일지를 다음에 열면 이 URL을 사용합니다.");
    } catch { setMessage("이 기기에서 설정을 저장하지 못했습니다. 브라우저의 저장 공간 권한을 확인해 주세요."); }
  }

  async function checkConnection() {
    setChecking(true);
    setConnection("");
    try {
      const response = await fetch("/api/app", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "연결 확인에 실패했습니다.");
      setConnection(`인증된 API 연결 정상 · 계약 ${result.data.contractVersion}. Google·밴드·실행기의 연결은 각 기능 화면에서 별도로 확인합니다.`);
    } catch (error) { setConnection(error instanceof Error && error.name !== "TimeoutError" ? error.message : "응답 시간이 초과되었습니다. 잠시 후 다시 확인해 주세요."); }
    finally { setChecking(false); }
  }

  return <div className="grid items-start gap-5 xl:grid-cols-2">
    <Panel>
      <h2 className="flex items-center gap-2 text-lg font-black"><Save size={18} aria-hidden="true" />출석시트 기본값</h2>
      <p className="mb-5 mt-2 text-sm leading-6 text-ink/65">세 화면이 같은 출석시트를 사용합니다. 설정은 현재 브라우저 또는 앱에만 저장됩니다.</p>
      <form onSubmit={save} className="grid gap-3">
        <label className="journal-label">구글시트 URL<input className="journal-input" type="url" value={url} required onChange={event => { setUrl(event.target.value); setMessage(""); }} /></label>
        <p className="text-xs leading-5 text-ink/60">날짜와 주차는 출석 실행에서 자동 계산하며, 해당 화면에서 직접 변경할 수 있습니다.</p>
        <button type="submit" className="focus-ring min-h-11 rounded bg-ink px-4 py-2 font-bold text-paper">설정 저장</button>
        <p role="status" className="text-sm leading-6 text-sea">{message}</p>
      </form>
    </Panel>
    <Panel>
      <h2 className="flex items-center gap-2 text-lg font-black"><Link2 size={18} aria-hidden="true" />앱 · API 연결</h2>
      <p className="mb-4 mt-2 text-sm leading-6 text-ink/65">웹과 Windows 앱이 같은 API를 사용합니다. 로그인한 사용자만 연결할 수 있으며 비밀키를 앱 화면에 넣지 않습니다.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={checkConnection} disabled={checking} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-sea/40 px-3 py-2 text-sm font-bold text-sea disabled:opacity-50"><CheckCircle2 size={16} aria-hidden="true" />{checking ? "확인 중…" : "API 연결 확인"}</button>
        <a href="/api/openapi" target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center rounded border border-line px-3 py-2 text-sm font-bold">API 명세 보기</a>
      </div>
      <p role="status" className="mt-3 text-sm leading-6 text-sea">{connection}</p>
      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink/60">출석 자동화에는 실행기(Runner)가 켜져 있어야 합니다. 모바일 화면만 열어 놓는 것으로 웹교적 자동화가 실행되지는 않습니다.</p>
    </Panel>
    <AppInstallCard />
  </div>;
}
