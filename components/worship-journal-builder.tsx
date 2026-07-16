"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CalendarDays, Check, ChevronRight, FileText, History, Link2, LoaderCircle, Plus, Save, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import type { GraduateEntry, NewFamilyEntry, WorshipJournal } from "@/lib/worship-journal";
import { fetchJson } from "@/lib/utils";

const ATTENDANCE_SHEET = "https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/edit";
const blankNewFamily = (): NewFamilyEntry => ({ name: "", generation: "", inviter: "", relationship: "", note: "" });
const blankGraduate = (): GraduateEntry => ({ name: "", generation: "", family: "" });

function upcomingSunday() {
  const date = new Date();
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date);
}

function attendanceText(count: number, online: number) {
  return online ? `${count}(온라인${online})` : String(count);
}

function JournalPreview({ journal }: { journal: WorshipJournal }) {
  return (
    <article className="journal-paper overflow-hidden rounded-[2px] border border-ink/25 bg-white shadow-[0_24px_60px_rgba(32,33,29,0.12)]">
      <header className="grid gap-2 border-b-2 border-ink bg-[#f1eee7] px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-[11px] font-black tracking-[0.2em] text-sea">WORSHIP LOG · 2청년회</p>
          <h2 className="mt-1 font-display text-2xl font-bold">제2청년회 예배일지</h2>
        </div>
        <div className="text-sm sm:text-right">
          <p className="font-black">{displayDate(journal.date)}</p>
          <p className="text-xs text-ink/55">작성자 {journal.author || "-"}</p>
        </div>
      </header>

      <section className="border-b border-ink/25">
        <div className="journal-section-title">출석</div>
        <div className="grid grid-cols-3 divide-x divide-ink/20 text-center">
          {[
            ["1~3부", attendanceText(journal.attendance.service13, journal.attendance.service13Online)],
            ["4부 청년예배", attendanceText(journal.attendance.service4, journal.attendance.service4Online)],
            ["가족모임", String(journal.attendance.familyMeeting)]
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-4">
              <p className="text-xs font-bold text-ink/55">{label}</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-ink/25 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black">가족별 출석 <span className="font-normal text-ink/45">1~3부 / 4부 / 가족</span></h3>
          <span className="text-xs font-bold text-ink/45">{journal.attendance.families.length}가족</span>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-ink/20 bg-ink/20 sm:grid-cols-4 lg:grid-cols-5">
          {journal.attendance.families.map((family) => (
            <div key={family.family} className="bg-white px-2 py-2 text-center">
              <p className="truncate text-xs font-bold">{family.family}</p>
              <p className="mt-1 font-mono text-sm font-black text-sea">{family.service13}/{family.service4}/{family.familyMeeting}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid border-b border-ink/25 md:grid-cols-2 md:divide-x md:divide-ink/25">
        <section className="p-4">
          <h3 className="text-sm font-black">새가족 <span className="text-brick">{journal.newFamilies.length}명</span></h3>
          <div className="mt-3 grid gap-2 text-sm">
            {journal.newFamilies.length ? journal.newFamilies.map((person, index) => (
              <div key={`${person.name}-${index}`} className="rounded border border-line bg-paper/40 px-3 py-2">
                <p className="font-black">{person.name} <span className="text-xs font-normal text-ink/50">{person.generation}</span></p>
                <p className="mt-1 text-xs text-ink/65">인도자 {person.inviter || "-"} · 관계 {person.relationship || "-"}{person.note ? ` · ${person.note}` : ""}</p>
              </div>
            )) : <p className="text-xs text-ink/40">입력 없음</p>}
          </div>
        </section>
        <section className="border-t border-ink/25 p-4 md:border-t-0">
          <h3 className="text-sm font-black">수료자(등반) <span className="text-moss">{journal.graduates.length}명</span></h3>
          <div className="mt-3 grid gap-2 text-sm">
            {journal.graduates.length ? journal.graduates.map((person, index) => (
              <div key={`${person.name}-${index}`} className="rounded border border-line bg-paper/40 px-3 py-2 font-bold">
                {person.name} <span className="text-xs font-normal text-ink/50">{person.generation} · {person.family}</span>
              </div>
            )) : <p className="text-xs text-ink/40">입력 없음</p>}
          </div>
        </section>
      </div>

      <section className="border-b border-ink/25 p-4">
        <div className="journal-section-title -mx-4 -mt-4 mb-4">예배 정보</div>
        <dl className="grid gap-px overflow-hidden rounded border border-ink/20 bg-ink/20 text-sm sm:grid-cols-2">
          {[
            ["설교 제목", journal.sermon.title], ["설교 본문", journal.sermon.passage], ["설교", journal.sermon.preacher],
            ["대표기도", journal.service.representativePrayer], ["헌금위원", journal.service.offeringMembers], ["헌금기도", journal.service.offeringPrayer],
            ["예배안내", journal.service.guide], ["식당봉사", journal.service.mealService], ["예배기도회", journal.service.prayerMeeting]
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[92px_1fr] bg-white">
              <dt className="bg-paper/70 px-3 py-2 font-black">{label}</dt><dd className="px-3 py-2">{value || "-"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="p-4">
        <div className="journal-section-title -mx-4 -mt-4 mb-4">기타사항 · 주보 광고</div>
        <ol className="grid gap-2 text-sm">
          {journal.announcements.map((announcement, index) => (
            <li key={`${announcement}-${index}`} className="flex gap-3 border-b border-dashed border-line pb-2 last:border-0">
              <span className="font-display font-black text-brass">{index + 1}.</span><span>{announcement}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

export function WorshipJournalBuilder() {
  const [date, setDate] = useState(upcomingSunday);
  const [author, setAuthor] = useState("박기도");
  const [attendanceSheetUrl, setAttendanceSheetUrl] = useState(ATTENDANCE_SHEET);
  const [attendanceSheetTab, setAttendanceSheetTab] = useState("가장체크");
  const [hwp, setHwp] = useState<File | null>(null);
  const [newFamilies, setNewFamilies] = useState<NewFamilyEntry[]>([blankNewFamily()]);
  const [graduates, setGraduates] = useState<GraduateEntry[]>([blankGraduate()]);
  const [journals, setJournals] = useState<WorshipJournal[]>([]);
  const [selected, setSelected] = useState<WorshipJournal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchJson<{ journals: WorshipJournal[] }>("/api/worship-journals").then((response) => {
      setJournals(response.journals); setSelected(response.journals[0] ?? null);
    }).catch(() => undefined);
  }, []);

  const canRun = useMemo(() => Boolean(date && attendanceSheetUrl.trim() && attendanceSheetTab.trim() && hwp), [date, attendanceSheetTab, attendanceSheetUrl, hwp]);

  function updateNewFamily(index: number, key: keyof NewFamilyEntry, value: string) {
    setNewFamilies((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  }
  function updateGraduate(index: number, key: keyof GraduateEntry, value: string) {
    setGraduates((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!hwp) return;
    setBusy(true); setError(null); setSaved(false);
    try {
      const body = new FormData();
      body.set("date", date); body.set("author", author); body.set("attendanceSheetUrl", attendanceSheetUrl);
      body.set("attendanceSheetTab", attendanceSheetTab); body.set("hwp", hwp);
      body.set("newFamilies", JSON.stringify(newFamilies)); body.set("graduates", JSON.stringify(graduates));
      const response = await fetchJson<{ journal: WorshipJournal; saved: boolean }>("/api/worship-journals", { method: "POST", body });
      setSelected(response.journal);
      setJournals((current) => [response.journal, ...current.filter((journal) => journal.date !== response.journal.date)]);
      setSaved(true); window.setTimeout(() => setSaved(false), 3500);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "예배일지를 만들지 못했습니다.");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
      <div className="grid min-w-0 gap-5">
        <form onSubmit={submit} className="grid gap-4">
          <section className="journal-input-card"><div className="journal-step">01</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-sea" /><h2 className="font-display text-xl font-bold">기본 정보</h2></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="journal-label">예배 날짜<input className="journal-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="journal-label">작성자<input className="journal-input" value={author} onChange={(event) => setAuthor(event.target.value)} /></label></div>
          </div></section>

          <section className="journal-input-card"><div className="journal-step">02</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2"><Link2 size={18} className="text-sea" /><h2 className="font-display text-xl font-bold">출석 구글 시트</h2></div>
            <div className="grid gap-3 sm:grid-cols-[1fr_150px]"><label className="journal-label">시트 링크<input className="journal-input" value={attendanceSheetUrl} onChange={(event) => setAttendanceSheetUrl(event.target.value)} /></label><label className="journal-label">탭 이름<input className="journal-input" value={attendanceSheetTab} onChange={(event) => setAttendanceSheetTab(event.target.value)} /></label></div>
            <p className="mt-2 text-xs text-ink/50">1~3부, 4부, 가족체크를 가족별로 자동 집계합니다.</p>
          </div></section>

          <section className="journal-input-card"><div className="journal-step">03</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2"><FileText size={18} className="text-sea" /><h2 className="font-display text-xl font-bold">2청년회 주보</h2></div>
            <label className="group flex cursor-pointer items-center justify-between gap-3 rounded border border-dashed border-sea/40 bg-sea/5 px-4 py-4 transition hover:bg-sea/10"><span className="min-w-0"><span className="block text-sm font-black">HWP 파일 선택</span><span className="block truncate text-xs text-ink/50">{hwp?.name ?? "설교·예배 섬김·광고를 자동으로 읽습니다."}</span></span><span className="rounded bg-sea px-3 py-2 text-xs font-black text-white">파일 찾기</span><input className="sr-only" type="file" accept=".hwp" onChange={(event: ChangeEvent<HTMLInputElement>) => setHwp(event.target.files?.[0] ?? null)} /></label>
          </div></section>

          <section className="journal-input-card"><div className="journal-step">04</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UserPlus size={18} className="text-brick" /><h2 className="font-display text-xl font-bold">새가족 수기 입력</h2></div><button type="button" className="journal-small-button" onClick={() => setNewFamilies((current) => [...current, blankNewFamily()])}><Plus size={14} /> 추가</button></div>
            <div className="grid gap-2">{newFamilies.map((entry, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/45 p-3 sm:grid-cols-[1fr_85px_1fr_1fr_1fr_auto]">
              <input className="journal-input" placeholder="이름" value={entry.name} onChange={(event) => updateNewFamily(index, "name", event.target.value)} /><input className="journal-input" placeholder="대수" value={entry.generation} onChange={(event) => updateNewFamily(index, "generation", event.target.value)} /><input className="journal-input" placeholder="인도자" value={entry.inviter} onChange={(event) => updateNewFamily(index, "inviter", event.target.value)} /><input className="journal-input" placeholder="관계" value={entry.relationship} onChange={(event) => updateNewFamily(index, "relationship", event.target.value)} /><input className="journal-input" placeholder="기타" value={entry.note} onChange={(event) => updateNewFamily(index, "note", event.target.value)} /><button type="button" className="grid size-10 place-items-center rounded border border-line text-ink/45 hover:border-brick hover:text-brick" aria-label="새가족 행 삭제" onClick={() => setNewFamilies((current) => current.length === 1 ? [blankNewFamily()] : current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
            </div>)}</div>
          </div></section>

          <section className="journal-input-card"><div className="journal-step">05</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users size={18} className="text-moss" /><h2 className="font-display text-xl font-bold">수료자(등반)</h2></div><button type="button" className="journal-small-button" onClick={() => setGraduates((current) => [...current, blankGraduate()])}><Plus size={14} /> 추가</button></div>
            <div className="grid gap-2">{graduates.map((entry, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/45 p-3 sm:grid-cols-[1fr_100px_1fr_auto]">
              <input className="journal-input" placeholder="이름" value={entry.name} onChange={(event) => updateGraduate(index, "name", event.target.value)} /><input className="journal-input" placeholder="대수" value={entry.generation} onChange={(event) => updateGraduate(index, "generation", event.target.value)} /><input className="journal-input" placeholder="등반 가족" value={entry.family} onChange={(event) => updateGraduate(index, "family", event.target.value)} /><button type="button" className="grid size-10 place-items-center rounded border border-line text-ink/45 hover:border-brick hover:text-brick" aria-label="수료자 행 삭제" onClick={() => setGraduates((current) => current.length === 1 ? [blankGraduate()] : current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
            </div>)}</div>
          </div></section>

          {error ? <div className="rounded border border-brick/30 bg-brick/10 p-4 text-sm font-bold text-brick">{error}</div> : null}
          <button type="submit" disabled={!canRun || busy} className="group relative flex min-h-16 items-center justify-center gap-3 overflow-hidden rounded bg-ink px-6 text-base font-black text-paper shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"><span className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-[110%]" />{busy ? <LoaderCircle size={20} className="animate-spin" /> : saved ? <Check size={20} /> : <Save size={20} />}{busy ? "자료를 읽고 예배일지를 만드는 중…" : saved ? "저장 완료" : "실행하고 저장"}</button>
        </form>
        {selected ? <JournalPreview journal={selected} /> : null}
      </div>

      <aside className="min-w-0"><div className="sticky top-5 grid gap-4">
        <section className="overflow-hidden rounded border border-line bg-ink text-paper shadow-xl"><div className="border-b border-white/10 px-5 py-5"><div className="flex items-center gap-2 text-brass"><Sparkles size={17} /><p className="text-xs font-black tracking-[0.18em]">ONE CLICK JOURNAL</p></div><h2 className="mt-3 font-display text-2xl font-bold">자료만 넣으면<br />일지는 정돈되어 남습니다.</h2></div><div className="grid gap-3 px-5 py-5 text-sm text-paper/70">{["출석 시트 3종 자동 집계", "HWP 설교·섬김 자동 추출", "광고 제목·일시만 간결하게", "날짜별 로컬 저장"].map((item) => <p key={item} className="flex items-center gap-2"><Check size={14} className="text-brass" />{item}</p>)}</div></section>
        <section className="rounded border border-line bg-white/75 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><History size={17} /> 저장된 일지</h2><span className="text-xs font-black text-ink/40">{journals.length}</span></div><div className="grid max-h-[430px] gap-2 overflow-y-auto pr-1">{journals.length ? journals.map((journal) => <button key={journal.id} type="button" onClick={() => setSelected(journal)} className={`group flex items-center justify-between gap-3 rounded border px-3 py-3 text-left transition ${selected?.id === journal.id ? "border-sea bg-sea/10" : "border-line bg-white hover:border-ink/30"}`}><span className="min-w-0"><span className="block truncate text-sm font-black">{displayDate(journal.date)}</span><span className="mt-1 block truncate text-xs text-ink/45">{journal.sermon.title || journal.source.hwpFileName}</span></span><ChevronRight size={15} className="shrink-0 text-ink/30 transition group-hover:translate-x-0.5" /></button>) : <div className="rounded border border-dashed border-line p-5 text-center text-xs text-ink/45"><BookOpenCheck className="mx-auto mb-2" size={22} />아직 저장된 예배일지가 없습니다.</div>}</div></section>
      </div></aside>
    </div>
  );
}
