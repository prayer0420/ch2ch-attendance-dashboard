"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileDown,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Sheet,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { Badge, Panel } from "@/components/ui";

type Preview = {
  id: string;
  createdAt: string;
  week: number;
  weekLabel: string;
  sheetUrl: string;
  sheetTab: string;
  department: string;
  downloadedCount: number;
  departmentCount: number;
  service13Names: string[];
  service4Names: string[];
  duplicate13Count: number;
  duplicate4Count: number;
  unmatched13Names: string[];
  unmatched4Names: string[];
  duplicateSheetNames: string[];
};

type ApplyResult = {
  appliedAt: string;
  service13Written: number;
  service4Written: number;
  attendanceUpdated: number;
  verified13: number;
  verified4: number;
  unmatched13Names: string[];
  unmatched4Names: string[];
  verificationFailures: Array<{ name: string; service: "1-3부" | "4부"; reason: string }>;
};

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/edit?usp=sharing";

function isoWeek() {
  const now = new Date();
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isoWeekSunday(week: number) {
  const now = new Date();
  const januaryFourth = new Date(Date.UTC(now.getFullYear(), 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "UTC"
  }).format(sunday);
}

function NameList({ title, names, tone }: { title: string; names: string[]; tone: "sea" | "brass" }) {
  return (
    <section className="min-w-0 border-t border-line pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        <Badge tone={tone === "sea" ? "good" : "warn"}>{names.length}명</Badge>
      </div>
      <div className="max-h-72 overflow-y-auto rounded border border-line bg-white">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
          {names.map((name) => (
            <span key={name} className="min-w-0 truncate bg-white px-3 py-2 text-sm font-bold" title={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QrAttendanceSync() {
  const [week, setWeek] = useState(isoWeek());
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [sheetTab, setSheetTab] = useState("가장체크");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unmatched = useMemo(
    () => [...new Set([...(preview?.unmatched13Names ?? []), ...(preview?.unmatched4Names ?? [])])],
    [preview]
  );
  const weekDate = useMemo(() => isoWeekSunday(week), [week]);

  async function loadPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("preview");
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const response = await fetch("/api/qr-attendance", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", week, sheetUrl, sheetTab })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "CH2CH QR 명단을 불러오지 못했습니다.");
      setPreview(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "CH2CH QR 명단을 불러오지 못했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function applyToSheet() {
    if (!preview) return;
    setLoading("apply");
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/qr-attendance", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", previewId: preview.id })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Google Sheet 반영에 실패했습니다.");
      setResult(payload.data);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Google Sheet 반영에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid min-w-0 content-start gap-4">
        <Panel className="p-5 sm:p-6">
          <form onSubmit={loadPreview} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
              <label className="grid gap-2 text-sm font-black">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>출석 주차</span>
                  <span className="text-xs font-bold text-sea">{week}주 · {weekDate}</span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={week}
                  onChange={(event) => setWeek(Number(event.target.value))}
                  disabled={Boolean(loading)}
                  className="h-12 rounded border border-line bg-white px-4 text-base font-black outline-none focus:border-sea focus:ring-2 focus:ring-sea/15"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-black">
                <span>Google Sheet URL</span>
                <input
                  value={sheetUrl}
                  onChange={(event) => setSheetUrl(event.target.value)}
                  disabled={Boolean(loading)}
                  className="h-12 min-w-0 rounded border border-line bg-white px-4 text-sm font-bold outline-none focus:border-sea focus:ring-2 focus:ring-sea/15"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
              <label className="grid gap-2 text-sm font-black">
                <span>대상 기관</span>
                <span className="flex h-12 items-center rounded border border-line bg-ink/5 px-4">2청년회 고정</span>
              </label>
              <label className="grid gap-2 text-sm font-black">
                <span>시트 탭</span>
                <input
                  value={sheetTab}
                  onChange={(event) => setSheetTab(event.target.value)}
                  disabled={Boolean(loading)}
                  className="h-12 rounded border border-line bg-white px-4 font-bold outline-none focus:border-sea focus:ring-2 focus:ring-sea/15"
                />
              </label>
              <button
                type="submit"
                disabled={Boolean(loading)}
                className="focus-ring mt-auto inline-flex h-12 items-center justify-center gap-2 rounded bg-ink px-5 text-sm font-black text-paper transition hover:bg-sea disabled:cursor-wait disabled:opacity-65"
              >
                {loading === "preview" ? <LoaderCircle size={18} className="animate-spin" /> : <FileDown size={18} />}
                {loading === "preview" ? "명단 읽는 중" : preview ? "명단 다시 읽기" : "QR 명단 불러오기"}
              </button>
            </div>
          </form>
          {error ? <div className="mt-5 rounded border border-brick/30 bg-brick/10 p-4 text-sm font-bold text-brick">{error}</div> : null}
        </Panel>

        {preview ? (
          <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-sea">{preview.weekLabel} 미리보기</p>
                <h2 className="mt-1 text-xl font-black">2청년회 QR 출석 대상</h2>
                <p className="mt-2 text-sm text-ink/60">CH2CH 출입명부 {preview.downloadedCount.toLocaleString()}명 중 기관 필터 결과 {preview.departmentCount}명</p>
              </div>
              <Badge tone={unmatched.length ? "warn" : "good"}>{unmatched.length ? `시트 미일치 ${unmatched.length}명` : "이름 대조 완료"}</Badge>
            </div>

            <div className="grid gap-3 border-b border-line py-5 sm:grid-cols-3">
              <div><p className="text-xs font-bold text-ink/50">1·2·3부</p><p className="mt-1 text-3xl font-black tabular-nums text-sea">{preview.service13Names.length}</p></div>
              <div><p className="text-xs font-bold text-ink/50">4부</p><p className="mt-1 text-3xl font-black tabular-nums text-brass">{preview.service4Names.length}</p></div>
              <div><p className="text-xs font-bold text-ink/50">중복 출입 제거</p><p className="mt-1 text-3xl font-black tabular-nums">{preview.duplicate13Count + preview.duplicate4Count}</p></div>
            </div>

            {unmatched.length ? (
              <div className="mt-5 rounded border border-brass/35 bg-brass/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-black text-brass"><AlertTriangle size={17} />가장체크에서 찾지 못한 이름</p>
                <p className="mt-2 font-bold text-ink">{unmatched.join(", ")}</p>
                <p className="mt-2 text-xs text-ink/60">명단에는 저장되지만 시트 이름과 정확히 일치하지 않아 해당 사람의 QR·참석은 자동 체크되지 않습니다.</p>
              </div>
            ) : null}

            {preview.duplicateSheetNames.length ? (
              <div className="mt-3 rounded border border-brass/35 bg-brass/10 p-4 text-sm">
                <p className="font-black text-brass">시트에 같은 이름이 여러 번 있는 사람</p>
                <p className="mt-2 font-bold">{preview.duplicateSheetNames.join(", ")}</p>
                <p className="mt-2 text-xs text-ink/60">알파벳까지 같은 이름이 여러 가족에 있으면 해당 이름의 모든 행이 체크됩니다.</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <NameList title="1·2·3부 명단" names={preview.service13Names} tone="sea" />
              <NameList title="4부 명단" names={preview.service4Names} tone="brass" />
            </div>
          </Panel>
        ) : null}

        {result ? (
          <Panel className="p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              {result.verificationFailures.length ? <AlertTriangle className="text-brick" /> : <CheckCircle2 className="text-moss" />}
              <div>
                <h2 className="text-xl font-black">최종 재검사 결과</h2>
                <p className="mt-1 text-xs font-bold text-ink/50">{new Date(result.appliedAt).toLocaleString("ko-KR")}</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead className="border-b border-line text-left text-xs text-ink/50"><tr><th className="py-2">항목</th><th>시트 기록</th><th>QR+참석 확인</th><th>상태</th></tr></thead>
                <tbody>
                  <tr className="border-b border-line/70"><td className="py-3 font-black">1·2·3부</td><td>{result.service13Written}명</td><td>{result.verified13}명</td><td><Badge tone={result.verified13 === result.service13Written - result.unmatched13Names.length ? "good" : "bad"}>확인</Badge></td></tr>
                  <tr className="border-b border-line/70"><td className="py-3 font-black">4부</td><td>{result.service4Written}명</td><td>{result.verified4}명</td><td><Badge tone={result.verified4 === result.service4Written - result.unmatched4Names.length ? "good" : "bad"}>확인</Badge></td></tr>
                  <tr><td className="py-3 font-black">참석 보강</td><td colSpan={2}>{result.attendanceUpdated}칸을 TRUE로 변경</td><td><Badge tone="good">방송·가족 미변경</Badge></td></tr>
                </tbody>
              </table>
            </div>
            {result.verificationFailures.length ? (
              <div className="mt-4 rounded border border-brick/30 bg-brick/10 p-4 text-sm text-brick">
                <p className="font-black">재검사 실패 {result.verificationFailures.length}건</p>
                <ul className="mt-2 grid gap-1 font-bold">{result.verificationFailures.map((failure) => <li key={`${failure.service}-${failure.name}`}>{failure.name} · {failure.service} · {failure.reason}</li>)}</ul>
              </div>
            ) : null}
          </Panel>
        ) : null}
      </div>

      <div className="grid h-fit content-start gap-4">
        <Panel>
          <div className="flex items-center gap-2"><ShieldCheck size={19} className="text-sea" /><h2 className="font-black">반영 규칙</h2></div>
          <ol className="mt-4 grid gap-4 text-sm">
            <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded bg-ink text-xs font-black text-paper">1</span><span><strong className="block">CH2CH 원본 수집</strong><span className="text-ink/60">선택한 주차의 출입명부 엑셀을 내려받습니다.</span></span></li>
            <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded bg-ink text-xs font-black text-paper">2</span><span><strong className="block">2청년회만 필터</strong><span className="text-ink/60">기관에 2청년회가 포함된 사람만 남깁니다.</span></span></li>
            <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded bg-ink text-xs font-black text-paper">3</span><span><strong className="block">예배별 시트 기록</strong><span className="text-ink/60">1·2·3부는 DQ:DR, 4부는 DS:DT에 기록합니다.</span></span></li>
            <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded bg-ink text-xs font-black text-paper">4</span><span><strong className="block">QR와 참석 재검사</strong><span className="text-ink/60">QR 대상자의 참석만 켜고 방송·가족은 변경하지 않습니다.</span></span></li>
          </ol>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2"><QrCode size={19} /><h2 className="font-black">실제 반영</h2></div>
          <p className="mt-3 text-sm leading-6 text-ink/60">미리보기에서 이름과 인원을 확인한 뒤 실행하세요. 기존 수동 참석은 해제하지 않고, QR 명단에 있는 사람만 참석을 추가합니다.</p>
          <button
            type="button"
            onClick={applyToSheet}
            disabled={!preview || Boolean(loading) || Boolean(result)}
            className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-sea px-4 py-3 text-sm font-black text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {loading === "apply" ? <LoaderCircle size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
            {loading === "apply" ? "시트 반영·재검사 중" : result ? "반영 완료" : "Google Sheet에 반영"}
          </button>
          <a href={sheetUrl} target="_blank" rel="noreferrer" className="focus-ring mt-2 inline-flex w-full items-center justify-center gap-2 rounded border border-line bg-white px-4 py-3 text-sm font-black text-ink hover:border-sea hover:text-sea">
            <ExternalLink size={17} />Google Sheet 열기
          </a>
        </Panel>

        <Panel>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
            <span className={`rounded px-2 py-2 ${preview ? "bg-moss/15 text-moss" : "bg-ink/5 text-ink/45"}`}><UsersRound className="mx-auto mb-1" size={17} />명단</span>
            <span className={`rounded px-2 py-2 ${loading === "apply" ? "bg-brass/15 text-brass" : result ? "bg-moss/15 text-moss" : "bg-ink/5 text-ink/45"}`}><Sheet className="mx-auto mb-1" size={17} />시트</span>
            <span className={`rounded px-2 py-2 ${result ? "bg-moss/15 text-moss" : "bg-ink/5 text-ink/45"}`}><RefreshCw className="mx-auto mb-1" size={17} />재검사</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
