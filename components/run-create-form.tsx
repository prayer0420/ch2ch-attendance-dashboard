"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckSquare,
  ExternalLink,
  FileUp,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Square,
  Users,
  XCircle
} from "lucide-react";
import { fetchJson } from "@/lib/utils";
import { applyAttendanceMode, buildAttendanceRunRows } from "@/lib/attendance-run-selection";

type RunResponse = {
  runId: string;
  status: string;
  demo?: boolean;
};

type DataSource = "google_sheet" | "file";
type RunOperation = "attendance_sync" | "clear_web_attendance";
type ServiceMode = "sheet" | "check" | "clear";

type SourcePerson = {
  family: string;
  name: string;
  service13: boolean;
  service4: boolean;
  note?: string;
};

type SourceFamily = {
  family: string;
  total: number;
  sunday: number;
  department: number;
};

type SourcePeopleResponse = {
  ok: boolean;
  people: SourcePerson[];
  families: SourceFamily[];
  totalPeople: number;
  message: string;
  warnings?: string[];
};

type FamilyMode = {
  sunday: ServiceMode;
  department: ServiceMode;
};

const MODE_LABEL: Record<ServiceMode, string> = {
  sheet: "시트 원본",
  check: "체크 예약",
  clear: "해제 예약"
};

const MODE_ICON: Record<ServiceMode, typeof RotateCcw> = {
  sheet: RotateCcw,
  check: CheckSquare,
  clear: XCircle
};

function modeButtonClass(value: ServiceMode, current: ServiceMode) {
  const active = value === current;
  if (!active) {
    return "border-line bg-white text-ink/65 hover:border-ink/30 hover:text-ink";
  }
  if (value === "check") return "border-moss bg-moss text-white";
  if (value === "clear") return "border-brick bg-brick text-white";
  return "border-ink bg-ink text-paper";
}

function countLabel(count: number) {
  return `${count}명`;
}

const SETTINGS_KEY = "ch2ch-run-settings-v4";

function mostRecentSunday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

function weekOfSunday(value: string) {
  const sunday = new Date(`${value}T12:00:00`);
  const firstSunday = new Date(sunday.getFullYear(), 0, 1, 12);
  firstSunday.setDate(firstSunday.getDate() + ((7 - firstSunday.getDay()) % 7));
  const elapsedWeeks = sunday < firstSunday
    ? 0
    : Math.floor((sunday.getTime() - firstSunday.getTime()) / (7 * 86400000));
  return { year: sunday.getFullYear(), week: elapsedWeeks + 1 };
}

function countPeople(people: SourcePerson[], modes: FamilyMode) {
  return people.reduce(
    (acc, person) => {
      const sunday = applyAttendanceMode(person.service13, modes.sunday);
      const department = applyAttendanceMode(person.service4, modes.department);
      if (sunday || department) acc.total += 1;
      if (sunday) acc.sunday += 1;
      if (department) acc.department += 1;
      return acc;
    },
    { total: 0, sunday: 0, department: 0 }
  );
}

export function RunCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    operation: "attendance_sync" as RunOperation,
    dataSource: "google_sheet" as DataSource,
    googleSheetUrl: "",
    googleSheetTab: "가장체크",
    targetDate: mostRecentSunday(),
    targetDept: "2청년회",
    targetCourse: "2026전입반",
    targetGroup: "26하",
    targetWeek: 1
  });
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [sourcePeople, setSourcePeople] = useState<SourcePerson[]>([]);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [familyModes, setFamilyModes] = useState<Record<string, FamilyMode>>({});
  const [familySearch, setFamilySearch] = useState("");
  const [showTargetsOnly, setShowTargetsOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentSunday = mostRecentSunday();
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<typeof form>;
        const { targetDate: savedTargetDate, ...savedSettings } = parsed;
        const restoredTargetDate = typeof savedTargetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(savedTargetDate)
          ? savedTargetDate
          : currentSunday;
        setForm((current) => ({ ...current, ...savedSettings, targetDate: restoredTargetDate }));
      } else {
        setForm((current) => ({ ...current, targetDate: currentSunday }));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(SETTINGS_KEY, JSON.stringify(form));
  }, [form, ready]);

  const calculatedWeek = useMemo(() => weekOfSunday(form.targetDate), [form.targetDate]);
  const weekText = `${calculatedWeek.year}년 ${calculatedWeek.week}주차`;

  const groupedFamilies = useMemo(() => {
    const map = new Map<string, SourcePerson[]>();
    for (const person of sourcePeople) {
      const rows = map.get(person.family) ?? [];
      rows.push(person);
      map.set(person.family, rows);
    }

    return Array.from(map.entries()).map(([family, people]) => {
      const modes = familyModes[family] ?? { sunday: "sheet", department: "sheet" };
      const sheet = {
        total: people.filter((person) => person.service13 || person.service4).length,
        sunday: people.filter((person) => person.service13).length,
        department: people.filter((person) => person.service4).length
      };
      const effective = countPeople(people, modes);
      return { family, people, modes, sheet, effective };
    });
  }, [familyModes, sourcePeople]);

  const visibleGroupedFamilies = useMemo(() => {
    const query = familySearch.replace(/\s+/g, "").toLowerCase();
    return groupedFamilies.filter((item) => {
      if (showTargetsOnly && item.effective.total === 0) return false;
      if (!query) return true;
      const familyMatch = item.family.replace(/\s+/g, "").toLowerCase().includes(query);
      const nameMatch = item.people.some((person) => person.name.replace(/\s+/g, "").toLowerCase().includes(query));
      return familyMatch || nameMatch;
    });
  }, [familySearch, groupedFamilies, showTargetsOnly]);

  const manualRows = useMemo(() => {
    return buildAttendanceRunRows(sourcePeople, familyModes);
  }, [familyModes, sourcePeople]);

  const effectiveTotals = useMemo(() => {
    return manualRows.reduce(
      (acc, person) => {
        acc.total += 1;
        if (person.service13) acc.sunday += 1;
        if (person.service4) acc.department += 1;
        return acc;
      },
      { total: 0, sunday: 0, department: 0 }
    );
  }, [manualRows]);

  function resetLoadedSource() {
    setSourcePeople([]);
    setSourceMessage(null);
    setSourceWarnings([]);
    setFamilyModes({});
    setFamilySearch("");
    setShowTargetsOnly(false);
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "dataSource" || key === "googleSheetUrl" || key === "googleSheetTab") resetLoadedSource();
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    resetLoadedSource();
  }

  function setAllFamilies(mode: ServiceMode) {
    setFamilyModes((current) => {
      const next = { ...current };
      for (const family of groupedFamilies.map((item) => item.family)) {
        next[family] = { sunday: mode, department: mode };
      }
      return next;
    });
  }

  function updateFamilyMode(family: string, patch: Partial<FamilyMode>) {
    setFamilyModes((current) => ({
      ...current,
      [family]: {
        sunday: current[family]?.sunday ?? "sheet",
        department: current[family]?.department ?? "sheet",
        ...patch
      }
    }));
  }

  async function loadSourcePeople() {
    setError(null);
    setSourceMessage(null);
    setSourceWarnings([]);

    if (form.dataSource === "file" && !file) {
      setError("파일 업로드 방식을 선택했다면 CSV, XLSX, XLS 또는 PDF 파일을 먼저 선택해 주세요.");
      return;
    }
    if (form.dataSource === "google_sheet" && !form.googleSheetUrl.trim()) {
      setError("구글시트 URL을 입력해 주세요.");
      return;
    }

    setIsLoadingSource(true);
    try {
      const request = form.dataSource === "file"
        ? (() => {
          const body = new FormData();
          body.set("googleSheetTab", form.googleSheetTab);
          if (file) body.set("file", file);
          return { body };
        })()
        : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleSheetUrl: form.googleSheetUrl,
            googleSheetTab: form.googleSheetTab
          })
        };

      const response = await fetchJson<SourcePeopleResponse>("/api/source-people", {
        method: "POST",
        ...request
      });
      const initialModes = Object.fromEntries(
        response.families.map((item) => [item.family, { sunday: "sheet" as ServiceMode, department: "sheet" as ServiceMode }])
      );
      setSourcePeople(response.people);
      setFamilyModes(initialModes);
      setSourceMessage(response.message);
      setSourceWarnings(response.warnings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "입력 데이터를 읽지 못했습니다.");
    } finally {
      setIsLoadingSource(false);
    }
  }

  function createRunBody() {
    const manualRowsJson = JSON.stringify(manualRows);

    if (form.dataSource === "file") {
      const body = new FormData();
      body.set("dataSource", "file");
      body.set("operation", form.operation);
      body.set("googleSheetTab", form.googleSheetTab);
      body.set("targetDept", form.targetDept);
      body.set("targetCourse", form.targetCourse);
      body.set("targetGroup", form.targetGroup);
      body.set("targetDate", form.targetDate);
      body.set("targetWeek", String(calculatedWeek.week));
      body.set("dryRun", "false");
      body.set("manualRows", manualRowsJson);
      if (file) body.set("file", file);
      return { body };
    }

    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        targetWeek: calculatedWeek.week,
        targetYear: calculatedWeek.year,
        manualRows,
        dryRun: false
      })
    };
  }

  async function submit() {
    setError(null);

    if (form.operation === "attendance_sync" && !sourcePeople.length) {
      setError("먼저 시트/파일을 읽어서 가족 목록을 확정해 주세요.");
      return;
    }

    if (form.operation === "attendance_sync" && !manualRows.length) {
      setError("현재 예약 상태로는 실행할 사람이 없습니다. 가족별 주일/부서 예약 값을 확인해 주세요.");
      return;
    }

    const confirmed = window.confirm(`정말 ${weekText} 출석체크를 CH2CH 교적부에 실제 저장할까요?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const request = createRunBody();
      const response = await fetchJson<RunResponse>("/api/runs", { method: "POST", ...request });
      router.push(`/runs/${response.runId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "실행 요청 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded border border-line bg-white/72 p-4">
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm font-bold">
              <span>작업 종류</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["attendance_sync", "시트 기준 출석체크"],
                  ["clear_web_attendance", "웹교적 주차 전체 해제"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`focus-ring rounded border px-3 py-2 text-sm font-black ${form.operation === value ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"}`}
                    onClick={() => update("operation", value as RunOperation)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.operation === "clear_web_attendance" ? (
                <p className="rounded border border-brick/30 bg-brick/10 p-3 text-xs font-bold text-brick">
                  선택한 주차의 웹교적 주일·부서 체크만 해제합니다. 선택한 시트/파일의 가족 목록만 읽고, 시트 내용은 변경하지 않습니다.
                </p>
              ) : null}
              데이터 소스
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["google_sheet", "구글시트 URL"],
                  ["file", "파일 업로드"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`focus-ring rounded border px-3 py-2 text-sm font-black ${form.dataSource === value ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"}`}
                    onClick={() => update("dataSource", value as DataSource)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.dataSource === "google_sheet" ? (
              <label className="grid gap-2 text-sm font-bold">
                구글시트 URL
                <input
                  className="focus-ring rounded border border-line bg-white px-3 py-2"
                  value={form.googleSheetUrl}
                  onChange={(event) => update("googleSheetUrl", event.target.value)}
                />
              </label>
            ) : (
              <label className="grid gap-2 text-sm font-bold">
                CSV / XLSX / XLS / PDF 파일
                <span className="focus-ring flex items-center gap-2 rounded border border-dashed border-line bg-white px-3 py-3 text-ink/70">
                  <FileUp size={18} />
                  <input className="w-full text-sm" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={onFileChange} />
                </span>
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                탭 이름
                <input
                  className="focus-ring rounded border border-line bg-white px-3 py-2"
                  value={form.googleSheetTab}
                  onChange={(event) => update("googleSheetTab", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                실행 날짜 (일요일)
                <input
                  className="focus-ring rounded border border-line bg-white px-3 py-2"
                  type="date"
                  value={form.targetDate}
                  onChange={(event) => update("targetDate", event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold">부서<input className="focus-ring rounded border border-line bg-white px-3 py-2" value={form.targetDept} onChange={(event) => update("targetDept", event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-bold">과정<input className="focus-ring rounded border border-line bg-white px-3 py-2" value={form.targetCourse} onChange={(event) => update("targetCourse", event.target.value)} /></label>
              <label className="grid gap-2 text-sm font-bold">그룹<input className="focus-ring rounded border border-line bg-white px-3 py-2" value={form.targetGroup} onChange={(event) => update("targetGroup", event.target.value)} /></label>
            </div>

            {error ? <div className="rounded border border-brick/30 bg-brick/10 p-3 text-sm font-bold text-brick">{error}</div> : null}
          </div>
        </section>

        <section className="rounded border border-line bg-white/72 p-4">
          <h2 className="text-lg font-black">실행 옵션</h2>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded border border-sea/40 bg-white px-4 py-2 font-bold text-sea disabled:opacity-60"
              disabled={isLoadingSource || isSubmitting}
              onClick={loadSourcePeople}
            >
              <Users size={17} />
              {isLoadingSource ? "가족 읽는 중" : "시트/파일에서 가족 불러오기"}
            </button>
            {form.dataSource === "google_sheet" ? (
              <a
                className="focus-ring inline-flex items-center justify-center gap-2 rounded border border-line bg-white px-4 py-2 font-bold"
                href={form.googleSheetUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} />
                구글시트 새 탭으로 열기
              </a>
            ) : null}
            <button
              type="button"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 font-bold text-paper disabled:opacity-60"
              disabled={isSubmitting || isLoadingSource}
              onClick={submit}
            >
              {form.operation === "clear_web_attendance" ? <XCircle size={17} /> : <Play size={17} />}
              {form.operation === "clear_web_attendance" ? "웹교적 주차 전체 해제 시작" : "실제 출석체크 시작"}
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-ink/60">
            파일 업로드는 CSV, XLSX, XLS, PDF를 지원합니다. 가장 정확한 방식은 구글시트 원본 URL 또는 Google Sheets에서 내려받은 XLSX/CSV입니다.
          </p>
        </section>
      </div>

      <section className="rounded border border-line bg-white/72 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <ListChecks size={20} />
              실행 예약 조정
            </h2>
            <p className="mt-1 text-sm text-ink/65">
              {sourceMessage ?? "시트/파일을 불러오면 실제 실행 전에 가족별 주일/부서 체크 예약을 조정할 수 있습니다."}
            </p>
            <p className="mt-1 text-xs font-bold text-ink/50">
              아래 버튼은 바로 CH2CH를 수정하지 않습니다. 마지막에 “실제 출석체크 시작”을 눌렀을 때 적용될 예약만 바꿉니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-bold disabled:opacity-50"
              disabled={form.operation !== "attendance_sync" || !sourcePeople.length}
              onClick={() => setAllFamilies("sheet")}
            >
              <RotateCcw size={16} />
              전체 원본대로
            </button>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-brick/35 bg-brick/10 px-3 py-2 text-sm font-bold text-brick disabled:opacity-50"
              disabled={!sourcePeople.length}
              onClick={() => setAllFamilies("clear")}
            >
              <XCircle size={16} />
              전체 해제 예약
            </button>
          </div>
        </div>

        {sourceWarnings.length ? (
          <div className="mt-4 rounded border border-brass/40 bg-brass/10 p-3 text-sm text-ink/75">
            <div className="mb-1 flex items-center gap-2 font-black text-brass">
              <AlertTriangle size={17} />
              읽기 확인 필요
            </div>
            <ul className="grid gap-1">
              {sourceWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {sourcePeople.length ? (
          <>
            {!effectiveTotals.total ? (
              <div className="mt-4 rounded border border-brick/30 bg-brick/10 p-3 text-sm font-bold text-brick">
                읽은 이름은 있지만 현재 실행 예약 대상이 0명입니다. 실행 예약 조정에서 주일/부서를 체크 예약하거나 A~DP 범위의 참석 칸을 확인해 주세요.
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["읽은 이름", countLabel(sourcePeople.length), "text-ink"],
                ["실행 예약", countLabel(effectiveTotals.total), "text-sea"],
                ["주일", countLabel(effectiveTotals.sunday), "text-moss"],
                ["부서", countLabel(effectiveTotals.department), "text-brass"]
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded border border-line bg-white p-3">
                  <p className="text-xs font-bold text-ink/55">{label}</p>
                  <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded border border-line bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="focus-within:outline-sea flex min-w-0 flex-1 items-center gap-2 rounded border border-line bg-paper/60 px-3 py-2 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
                <Search size={17} className="shrink-0 text-ink/45" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  value={familySearch}
                  onChange={(event) => setFamilySearch(event.target.value)}
                  placeholder="가족 또는 이름 검색"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2 font-bold text-ink/70">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sea"
                    checked={showTargetsOnly}
                    onChange={(event) => setShowTargetsOnly(event.target.checked)}
                  />
                  대상 있는 가족만
                </label>
                <span className="rounded border border-line bg-paper/70 px-2 py-1 text-xs font-bold text-ink/55">
                  {visibleGroupedFamilies.length} / {groupedFamilies.length}가족
                </span>
              </div>
            </div>

            {visibleGroupedFamilies.length ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {visibleGroupedFamilies.map((item) => {
                  const sundayPeople = item.people.filter((person) => applyAttendanceMode(person.service13, item.modes.sunday));
                  const departmentPeople = item.people.filter((person) => applyAttendanceMode(person.service4, item.modes.department));
                  const changed = item.modes.sunday !== "sheet" || item.modes.department !== "sheet";

                  return (
                    <article
                      key={item.family}
                      className={`rounded border bg-white p-4 shadow-sm ${item.effective.total ? "border-sea/35" : "border-line"}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black">{item.family}</h3>
                          <p className="mt-1 text-xs font-bold text-ink/55">
                            원본 {countLabel(item.sheet.total)} · 주일 {item.sheet.sunday} · 부서 {item.sheet.department}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded border border-sea/25 bg-sea/10 px-2 py-1 text-xs font-black text-sea">
                            예약 {countLabel(item.effective.total)}
                          </span>
                          {changed ? (
                            <span className="rounded border border-brass/35 bg-brass/10 px-2 py-1 text-xs font-black text-brass">
                              수정됨
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {([
                          { key: "sunday", label: "주일", sheet: item.sheet.sunday, effective: item.effective.sunday },
                          { key: "department", label: "부서", sheet: item.sheet.department, effective: item.effective.department }
                        ] as const).map((service) => (
                          <div key={service.key} className="rounded border border-line bg-paper/45 p-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-black">{service.label}</span>
                              <span className="font-bold text-ink/55">
                                시트 {service.sheet} → 예약 {service.effective}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1">
                              {(["sheet", "check", "clear"] as ServiceMode[]).map((mode) => {
                                const Icon = MODE_ICON[mode];
                                return (
                                  <button
                                    key={mode}
                                    type="button"
                                    className={`focus-ring inline-flex min-h-9 items-center justify-center gap-1 rounded border px-2 text-xs font-black transition ${modeButtonClass(mode, item.modes[service.key])}`}
                                    onClick={() => updateFamilyMode(item.family, { [service.key]: mode } as Partial<FamilyMode>)}
                                  >
                                    <Icon size={13} />
                                    {MODE_LABEL[mode]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-xs font-bold"
                          onClick={() => updateFamilyMode(item.family, { sunday: "sheet", department: "sheet" })}
                        >
                          <RotateCcw size={14} />
                          이 가족 원본대로
                        </button>
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-1 rounded border border-brick/35 bg-brick/10 px-2 py-1 text-xs font-bold text-brick"
                          onClick={() => updateFamilyMode(item.family, { sunday: "clear", department: "clear" })}
                        >
                          <Square size={14} />
                          모두 해제 예약
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-moss">주일 체크 예약 {countLabel(sundayPeople.length)}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sundayPeople.length ? (
                              <>
                                {sundayPeople.slice(0, 8).map((person) => (
                                  <span key={`${item.family}-sunday-${person.name}`} className="rounded bg-moss/10 px-2 py-1 text-xs font-bold text-moss">
                                    {person.name}
                                  </span>
                                ))}
                                {sundayPeople.length > 8 ? (
                                  <span className="rounded bg-paper px-2 py-1 text-xs font-bold text-ink/55">외 {sundayPeople.length - 8}명</span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-xs font-bold text-ink/40">없음</span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-sea">부서 체크 예약 {countLabel(departmentPeople.length)}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {departmentPeople.length ? (
                              <>
                                {departmentPeople.slice(0, 8).map((person) => (
                                  <span key={`${item.family}-department-${person.name}`} className="rounded bg-sea/10 px-2 py-1 text-xs font-bold text-sea">
                                    {person.name}
                                  </span>
                                ))}
                                {departmentPeople.length > 8 ? (
                                  <span className="rounded bg-paper px-2 py-1 text-xs font-bold text-ink/55">외 {departmentPeople.length - 8}명</span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-xs font-bold text-ink/40">없음</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded border border-dashed border-line bg-white/60 p-6 text-sm font-bold text-ink/55">
                검색 조건에 맞는 가족이 없습니다.
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 rounded border border-dashed border-line bg-white/50 p-6 text-sm text-ink/60">
            가족 목록을 불러오면 이곳에서 실제 실행 전에 가족별 주일/부서 체크 예약을 조정할 수 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}
