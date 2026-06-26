"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckSquare,
  ExternalLink,
  FileUp,
  ListChecks,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  TestTube2,
  Users,
  XCircle
} from "lucide-react";
import { fetchJson } from "@/lib/utils";

type RunResponse = {
  runId: string;
  status: string;
  demo?: boolean;
};

type DataSource = "google_sheet" | "file";
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
};

type FamilyMode = {
  sunday: ServiceMode;
  department: ServiceMode;
};

const MODE_LABEL: Record<ServiceMode, string> = {
  sheet: "시트 기준",
  check: "체크",
  clear: "해제"
};

function applyMode(original: boolean, mode: ServiceMode) {
  if (mode === "check") return true;
  if (mode === "clear") return false;
  return original;
}

function countPeople(people: SourcePerson[], modes: FamilyMode) {
  return people.reduce(
    (acc, person) => {
      const sunday = applyMode(person.service13, modes.sunday);
      const department = applyMode(person.service4, modes.department);
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
    dataSource: "google_sheet" as DataSource,
    googleSheetUrl: "https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/edit?usp=drivesdk",
    googleSheetTab: "가장체크",
    targetDept: "2청년회",
    targetWeek: 24
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [sourcePeople, setSourcePeople] = useState<SourcePerson[]>([]);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [familyModes, setFamilyModes] = useState<Record<string, FamilyMode>>({});
  const [error, setError] = useState<string | null>(null);

  const weekText = useMemo(() => `${form.targetWeek}주`, [form.targetWeek]);

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

  const manualRows = useMemo(() => {
    return sourcePeople
      .map((person) => {
        const modes = familyModes[person.family] ?? { sunday: "sheet", department: "sheet" };
        return {
          family: person.family,
          name: person.name,
          service13: applyMode(person.service13, modes.sunday),
          service4: applyMode(person.service4, modes.department),
          note: person.note ?? ""
        };
      })
      .filter((person) => person.service13 || person.service4);
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
    setFamilyModes({});
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "입력 데이터를 읽지 못했습니다.");
    } finally {
      setIsLoadingSource(false);
    }
  }

  function createRunBody(testMode: boolean) {
    const manualRowsJson = JSON.stringify(manualRows);
    if (form.dataSource === "file") {
      const body = new FormData();
      body.set("dataSource", "file");
      body.set("googleSheetTab", form.googleSheetTab);
      body.set("targetDept", form.targetDept);
      body.set("targetWeek", String(form.targetWeek));
      body.set("dryRun", String(testMode));
      body.set("manualRows", manualRowsJson);
      if (file) body.set("file", file);
      return { body };
    }

    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        manualRows,
        dryRun: testMode
      })
    };
  }

  async function submit(testMode: boolean) {
    setError(null);

    if (!sourcePeople.length) {
      setError("먼저 시트/파일을 읽어서 가족 목록을 확정해 주세요.");
      return;
    }

    if (!manualRows.length) {
      setError("현재 체크 상태로는 실행할 사람이 없습니다. 가족별 체크 값을 확인해 주세요.");
      return;
    }

    if (!testMode) {
      const confirmed = window.confirm(`정말 ${weekText} 출석체크를 CH2CH 교적부에 실제 저장할까요? 저장 버튼(Alt+S)까지 실행됩니다.`);
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      const request = createRunBody(testMode);
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
                실행 주차
                <input
                  className="focus-ring rounded border border-line bg-white px-3 py-2"
                  type="number"
                  min="1"
                  max="53"
                  value={form.targetWeek}
                  onChange={(event) => update("targetWeek", Number(event.target.value))}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-bold">
              부서
              <input
                className="focus-ring rounded border border-line bg-white px-3 py-2"
                value={form.targetDept}
                onChange={(event) => update("targetDept", event.target.value)}
              />
            </label>

            {error ? <div className="rounded border border-brick/30 bg-brick/10 p-3 text-sm font-bold text-brick">{error}</div> : null}
          </div>
        </section>

        <section className="rounded border border-line bg-white/72 p-4">
          <h2 className="text-lg font-black">실행 옵션</h2>
          <div className="mt-4 rounded border border-brass/35 bg-brass/10 p-3 text-sm text-ink/75">
            <AlertTriangle className="mb-2 text-brass" size={18} />
            실제 실행은 브라우저에서 CH2CH 화면을 직접 처리하고 저장 버튼 또는 Alt+S를 실행합니다.
          </div>

          <div className="mt-5 rounded border border-sea/30 bg-white p-3 text-sm">
            <div className="flex items-center gap-2 font-black text-sea">
              <ShieldCheck size={18} />
              실행 주차: {weekText}
            </div>
            <p className="mt-1 text-ink/65">4부는 참석 칸만 부서 출석으로 반영됩니다.</p>
          </div>

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
              className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-sea px-4 py-2 font-bold text-white disabled:opacity-60"
              disabled={isSubmitting || isLoadingSource}
              onClick={() => submit(true)}
            >
              <TestTube2 size={17} />
              테스트 실행 시작
            </button>
            <button
              type="button"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-ink px-4 py-2 font-bold text-paper disabled:opacity-60"
              disabled={isSubmitting || isLoadingSource}
              onClick={() => submit(false)}
            >
              <Play size={17} />
              실제 출석체크 시작
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
              가족별 체크 제어
            </h2>
            <p className="mt-1 text-sm text-ink/65">
              {sourceMessage ?? "시트/파일을 불러오면 가족별 주일과 부서 체크 값을 조정할 수 있습니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-bold disabled:opacity-50"
              disabled={!sourcePeople.length}
              onClick={() => setAllFamilies("sheet")}
            >
              <RotateCcw size={16} />
              전체 시트 기준
            </button>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-moss/35 bg-moss/10 px-3 py-2 text-sm font-bold text-moss disabled:opacity-50"
              disabled={!sourcePeople.length}
              onClick={() => setAllFamilies("check")}
            >
              <CheckSquare size={16} />
              전체 체크
            </button>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-brick/35 bg-brick/10 px-3 py-2 text-sm font-bold text-brick disabled:opacity-50"
              disabled={!sourcePeople.length}
              onClick={() => setAllFamilies("clear")}
            >
              <XCircle size={16} />
              전체 해제
            </button>
          </div>
        </div>

        {sourcePeople.length ? (
          <>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
              <div className="rounded border border-line bg-white p-3">
                <p className="text-xs font-bold text-ink/55">읽은 이름</p>
                <p className="mt-1 text-xl font-black">{sourcePeople.length}명</p>
              </div>
              <div className="rounded border border-line bg-white p-3">
                <p className="text-xs font-bold text-ink/55">실행 대상</p>
                <p className="mt-1 text-xl font-black">{effectiveTotals.total}명</p>
              </div>
              <div className="rounded border border-line bg-white p-3">
                <p className="text-xs font-bold text-ink/55">주일</p>
                <p className="mt-1 text-xl font-black">{effectiveTotals.sunday}명</p>
              </div>
              <div className="rounded border border-line bg-white p-3">
                <p className="text-xs font-bold text-ink/55">부서</p>
                <p className="mt-1 text-xl font-black">{effectiveTotals.department}명</p>
              </div>
            </div>

            <div className="mt-4 max-h-[520px] overflow-auto rounded border border-line bg-white">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead className="sticky top-0 bg-paper text-left">
                  <tr className="border-b border-line">
                    <th className="px-3 py-2">가족</th>
                    <th className="px-3 py-2">시트 기준</th>
                    <th className="px-3 py-2">실행 값</th>
                    <th className="px-3 py-2">주일</th>
                    <th className="px-3 py-2">부서</th>
                    <th className="px-3 py-2">가족 제어</th>
                    <th className="px-3 py-2">이름</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedFamilies.map((item) => (
                    <tr key={item.family} className="border-b border-line/70 align-top last:border-0">
                      <td className="px-3 py-3 font-black">{item.family}</td>
                      <td className="px-3 py-3 text-ink/70">
                        {item.sheet.total}명 · 주일 {item.sheet.sunday} · 부서 {item.sheet.department}
                      </td>
                      <td className="px-3 py-3 font-bold text-sea">
                        {item.effective.total}명 · 주일 {item.effective.sunday} · 부서 {item.effective.department}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="focus-ring rounded border border-line bg-white px-2 py-1"
                          value={item.modes.sunday}
                          onChange={(event) => updateFamilyMode(item.family, { sunday: event.target.value as ServiceMode })}
                        >
                          {Object.entries(MODE_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="focus-ring rounded border border-line bg-white px-2 py-1"
                          value={item.modes.department}
                          onChange={(event) => updateFamilyMode(item.family, { department: event.target.value as ServiceMode })}
                        >
                          {Object.entries(MODE_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="focus-ring inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-xs font-bold"
                            onClick={() => updateFamilyMode(item.family, { sunday: "sheet", department: "sheet" })}
                          >
                            <RotateCcw size={14} />
                            기준
                          </button>
                          <button
                            type="button"
                            className="focus-ring inline-flex items-center gap-1 rounded border border-moss/35 bg-moss/10 px-2 py-1 text-xs font-bold text-moss"
                            onClick={() => updateFamilyMode(item.family, { sunday: "check", department: "check" })}
                          >
                            <CheckSquare size={14} />
                            체크
                          </button>
                          <button
                            type="button"
                            className="focus-ring inline-flex items-center gap-1 rounded border border-brick/35 bg-brick/10 px-2 py-1 text-xs font-bold text-brick"
                            onClick={() => updateFamilyMode(item.family, { sunday: "clear", department: "clear" })}
                          >
                            <Square size={14} />
                            해제
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink/65">
                        {item.people.slice(0, 10).map((person) => person.name).join(", ")}
                        {item.people.length > 10 ? ` 외 ${item.people.length - 10}명` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded border border-dashed border-line bg-white/50 p-6 text-sm text-ink/60">
            가족 목록을 불러오면 이곳에서 가족별 주일/부서 체크와 해제를 조정할 수 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}
