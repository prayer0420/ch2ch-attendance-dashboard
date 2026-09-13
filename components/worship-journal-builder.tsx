"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpenCheck, CalendarDays, Check, ChevronRight, Download, ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, ChevronDown, History, Link2, LoaderCircle, Plus, Save, SearchCheck, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import type { GraduateEntry, NewFamilyEntry, WorshipJournal, WorshipService } from "@/lib/worship-journal";
import { isAccountingSourceReady } from "@/lib/worship-journal-accounting";
import { fetchJson } from "@/lib/utils";
import { WorshipAccountingReview } from "@/components/worship-accounting-review";
import { WorshipJournalSources } from "@/components/worship-journal-sources";
import { validateWorshipJournalForPublish, type WorshipJournalValidationReport } from "@/lib/worship-journal-validation";
import { DEFAULT_ATTENDANCE_SHEET_URL, readAttendanceSheetUrl, saveAttendanceSheetUrl } from "@/lib/attendance-sheet-preference";
import { BandPublishCard } from "@/components/band-publish-card";

const ACCOUNTING_SHEET = "https://docs.google.com/spreadsheets/d/1SCmg4YEDBLre3fgWCRfUS1gGL4WW1MnZ/edit?gid=1816474511#gid=1816474511";
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

function announcementRows(value: string) {
  const visualLines = value.split("\n").reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 42)), 0);
  return Math.min(9, Math.max(3, visualLines));
}

function journalFileStem(journal: WorshipJournal) {
  return `예배일지-${journal.date.replaceAll("-", "")}`;
}

function worshipJournalBandText(journal: WorshipJournal) {
  const accounting = journal.accounting;
  return [
    `[제2청년회 예배일지] ${displayDate(journal.date)}`,
    "",
    `출석: 1~3부 ${attendanceText(journal.attendance.service13, journal.attendance.service13Online)}명 / 4부 ${attendanceText(journal.attendance.service4, journal.attendance.service4Online)}명 / 가족모임 ${journal.attendance.familyMeeting}명`,
    `말씀: ${journal.sermon.title} (${journal.sermon.passage}) / ${journal.sermon.preacher}`,
    accounting ? `헌금: 주일 ${accounting.sundayTotal.toLocaleString("ko-KR")}원 / 감사 ${accounting.thanksgivingTotal.toLocaleString("ko-KR")}원 / 총액 ${accounting.total.toLocaleString("ko-KR")}원` : "",
    "",
    "[광고사항]",
    ...journal.announcements.map((item, index) => `${index + 1}. ${item}`),
    "",
    `작성자: ${journal.author}`
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n").trim();
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function JournalPreview({ journal, reviewMode = false, exportMode = false }: { journal: WorshipJournal; reviewMode?: boolean; exportMode?: boolean }) {
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

      {journal.outputSheet && !exportMode ? <a href={journal.outputSheet.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 border-b border-ink/25 bg-sea/10 px-5 py-3 text-sm font-black text-sea hover:bg-sea/15">
        <span>Google Sheet {journal.outputSheet.sheetTitle} 탭이 생성되었습니다.</span><ExternalLink size={16} />
      </a> : null}

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

      {journal.accounting ? <section className="border-b border-ink/25 p-4" aria-labelledby="accounting-title">
        <div className="journal-section-title -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3">
          <span id="accounting-title">회계·헌금</span>
          <strong className="font-mono text-sm text-brass">{journal.accounting.total.toLocaleString("ko-KR")}원</strong>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            ["주일헌금", journal.accounting.sundayTotal ?? 0],
            ["감사헌금", journal.accounting.thanksgivingTotal ?? journal.accounting.total],
            ["총액", journal.accounting.total]
          ].map(([label, amount]) => <div key={String(label)} className="rounded border border-line bg-paper/50 px-2 py-3"><p className="font-bold text-ink/50">{label}</p><p className="mt-1 font-mono text-sm font-black">{Number(amount).toLocaleString("ko-KR")}원</p></div>)}
        </div>
        <div className="space-y-3">{([
          ["감사헌금", journal.accounting.thanksgiving]
        ] as const).map(([label, entries]) => <details key={label} open={label === "감사헌금"} className="rounded border border-line">
          <summary className="cursor-pointer bg-paper/50 p-3 text-sm font-bold">{label} · {entries.length}건</summary>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-y border-line"><th className="p-2">이름</th><th className="p-2">금액</th><th className="p-2">감사내용</th></tr></thead><tbody>{[...entries].sort((a,b) => (label === "감사헌금" ? Number(Boolean(b.note.trim())) - Number(Boolean(a.note.trim())) : 0) || a.name.localeCompare(b.name,"ko-KR")).map((entry,index) => <tr key={index} className="border-b border-line"><td className="whitespace-nowrap p-2">{entry.name}</td><td className="whitespace-nowrap p-2 tabular-nums">{entry.amount.toLocaleString("ko-KR")}원</td><td className="whitespace-pre-wrap p-2">{entry.note || "—"}</td></tr>)}</tbody></table></div>
        </details>)}</div>
      </section> : null}

      <section className="border-b border-ink/25 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black">가족별 출석</h3>
          <span className="text-xs font-bold text-ink/45">{journal.attendance.families.length}가족</span>
        </div>
        <div className="overflow-hidden rounded border border-ink/20">
          <div className="grid grid-cols-[minmax(100px,1fr)_64px_64px_72px] bg-ink px-3 py-2 text-center text-[11px] font-black text-paper"><span className="text-left">가족</span><span>1~3부</span><span>4부</span><span>가족모임</span></div>
          <div>{journal.attendance.families.map((family) => (
            <div key={family.family} className="grid grid-cols-[minmax(100px,1fr)_64px_64px_72px] border-t border-ink/10 bg-white px-3 py-2 text-center text-sm">
              <span className="truncate text-left font-bold">{family.family}</span><span>{family.service13}</span><span>{family.service4}</span><span>{family.familyMeeting}</span>
            </div>
          ))}</div>
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
              <span className="font-display font-black text-brass">{index + 1}.</span><span className="min-w-0 whitespace-pre-wrap break-words leading-6">{announcement}</span>
            </li>
          ))}
        </ol>
      </section>

      {reviewMode && journal.extraction ? <section className="border-t-2 border-sea bg-sea/5 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-sea"><SearchCheck size={17} /> 원문 추출 결과 검토</h3>
        <p className="mt-2 text-xs leading-5 text-ink/60">이 내용은 자동 교정하지 않은 원문 텍스트입니다. 이름과 예배 담당자를 원본 주보와 비교한 뒤 생성 버튼을 누르세요.</p>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-line bg-white p-3 text-xs leading-5">{journal.extraction.evidenceLines.join("\n")}</pre>
      </section> : null}
    </article>
  );
}

function ReviewField({ label, value, onChange, type = "text", multiline = false }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  multiline?: boolean;
}) {
  const shared = {
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    onDragOver: (event: React.DragEvent) => event.preventDefault(),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const dropped = event.dataTransfer.getData("text/plain").trim();
      if (dropped) onChange(dropped);
    },
    className: "journal-input bg-white"
  };
  return <label className="journal-label">{label}{multiline
    ? <textarea {...shared} rows={2} />
    : <input {...shared} type={type} min={type === "number" ? 0 : undefined} />}</label>;
}

function WorshipJournalReviewEditor({ journal, onChange }: { journal: WorshipJournal; onChange: (journal: WorshipJournal) => void }) {
  const updateAttendance = (key: keyof Omit<WorshipJournal["attendance"], "families">, value: string) => onChange({
    ...journal,
    attendance: { ...journal.attendance, [key]: Number(value) || 0 }
  });
  const updateService = (key: keyof WorshipService, value: string) => onChange({ ...journal, service: { ...journal.service, [key]: value } });
  const updateSermon = (key: keyof WorshipJournal["sermon"], value: string) => onChange({ ...journal, sermon: { ...journal.sermon, [key]: value } });
  const moveAnnouncement = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= journal.announcements.length) return;
    const announcements = [...journal.announcements];
    [announcements[index], announcements[target]] = [announcements[target], announcements[index]];
    onChange({ ...journal, announcements });
  };

  return <article className="overflow-hidden rounded border-2 border-sea/35 bg-white shadow-[0_24px_60px_rgba(32,33,29,0.12)]">
    <header className="border-b border-line bg-sea/10 px-5 py-5">
      <p className="text-xs font-black tracking-[0.18em] text-sea">EDITABLE REVIEW</p>
      <h2 className="mt-1 font-display text-2xl font-bold">예배일지 검토·편집</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">항목을 펼쳐 내용을 확인하고 수정하세요. 최종 제출 시 화면에서 수정한 값이 반영됩니다.</p>
    </header>

    <details open className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">출석 합계<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="border-b border-line p-4">
      <h3 className="mb-3 text-sm font-black">출석 합계</h3>
      <div className="grid gap-3 sm:grid-cols-5">
        <ReviewField label="1~3부" value={journal.attendance.service13} type="number" onChange={(value) => updateAttendance("service13", value)} />
        <ReviewField label="1~3부 온라인" value={journal.attendance.service13Online} type="number" onChange={(value) => updateAttendance("service13Online", value)} />
        <ReviewField label="4부" value={journal.attendance.service4} type="number" onChange={(value) => updateAttendance("service4", value)} />
        <ReviewField label="4부 온라인" value={journal.attendance.service4Online} type="number" onChange={(value) => updateAttendance("service4Online", value)} />
        <ReviewField label="가족모임" value={journal.attendance.familyMeeting} type="number" onChange={(value) => updateAttendance("familyMeeting", value)} />
      </div>
    </section></details>

    <details className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">가족별 출석<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="border-b border-line p-4">
      <h3 className="mb-3 text-sm font-black">가족별 출석 <span className="font-normal text-ink/45">각 숫자를 별도 칸에서 수정</span></h3>
      <div className="grid gap-2">
        <div className="hidden grid-cols-[minmax(120px,1fr)_90px_90px_90px] gap-2 px-2 text-center text-xs font-black text-ink/45 sm:grid"><span className="text-left">가족</span><span>1~3부</span><span>4부</span><span>가족모임</span></div>
        {journal.attendance.families.map((family, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/35 p-2 sm:grid-cols-[minmax(120px,1fr)_90px_90px_90px]">
          <input className="journal-input" value={family.family} aria-label={`${index + 1}번째 가족명`} onChange={(event) => onChange({ ...journal, attendance: { ...journal.attendance, families: journal.attendance.families.map((item, itemIndex) => itemIndex === index ? { ...item, family: event.target.value } : item) } })} />
          {(["service13", "service4", "familyMeeting"] as const).map((key) => <input key={key} className="journal-input text-center" type="number" min={0} value={family[key]} aria-label={`${family.family} ${key}`} onChange={(event) => onChange({ ...journal, attendance: { ...journal.attendance, families: journal.attendance.families.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: Number(event.target.value) || 0 } : item) } })} />)}
        </div>)}
      </div>
    </section></details>

    <details className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">새가족·수료자<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="border-b border-line p-4">
      <div className="grid gap-5">
        <div>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black">새가족</h3><button type="button" className="journal-small-button" onClick={() => onChange({ ...journal, newFamilies: [...journal.newFamilies, blankNewFamily()] })}><Plus size={14} /> 추가</button></div>
          <div className="grid gap-2">{journal.newFamilies.map((person, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/35 p-2 sm:grid-cols-[1fr_75px_1fr_1fr_auto]">
            {([['name', '이름'], ['generation', '대수'], ['inviter', '인도자'], ['relationship', '관계']] as const).map(([key, placeholder]) => <input key={key} className="journal-input" value={person[key]} placeholder={placeholder} onChange={(event) => onChange({ ...journal, newFamilies: journal.newFamilies.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item) })} />)}
            <button type="button" className="grid size-10 place-items-center rounded border border-line text-brick" aria-label="새가족 삭제" onClick={() => onChange({ ...journal, newFamilies: journal.newFamilies.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /></button>
            <input className="journal-input sm:col-span-5" value={person.note} placeholder="기타사항" onChange={(event) => onChange({ ...journal, newFamilies: journal.newFamilies.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item) })} />
          </div>)}</div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black">수료자(등반)</h3><button type="button" className="journal-small-button" onClick={() => onChange({ ...journal, graduates: [...journal.graduates, blankGraduate()] })}><Plus size={14} /> 추가</button></div>
          <div className="grid gap-2">{journal.graduates.map((person, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/35 p-2 sm:grid-cols-[1fr_80px_1fr_auto]">
            {([['name', '이름'], ['generation', '대수'], ['family', '등반 가족']] as const).map(([key, placeholder]) => <input key={key} className="journal-input" value={person[key]} placeholder={placeholder} onChange={(event) => onChange({ ...journal, graduates: journal.graduates.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item) })} />)}
            <button type="button" className="grid size-10 place-items-center rounded border border-line text-brick" aria-label="수료자 삭제" onClick={() => onChange({ ...journal, graduates: journal.graduates.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /></button>
          </div>)}</div>
        </div>
      </div>
    </section></details>

    {journal.accounting ? <details open className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">회계·헌금 · 이름과 감사내용<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="bg-brass/5 p-4">
      <WorshipAccountingReview accounting={journal.accounting} onChange={(accounting) => onChange({...journal, accounting})} />
    </section></details> : null}

    <details open className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">설교 정보<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="border-b border-line p-4">
      <h3 className="mb-3 text-sm font-black">설교 정보</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <ReviewField label="설교제목" value={journal.sermon.title} onChange={(value) => updateSermon("title", value)} />
        <ReviewField label="설교본문" value={journal.sermon.passage} onChange={(value) => updateSermon("passage", value)} />
        <ReviewField label="설교자" value={journal.sermon.preacher} onChange={(value) => updateSermon("preacher", value)} />
      </div>
    </section></details>

    <details open className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">예배 담당<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="border-b border-line p-4">
      <h3 className="mb-3 text-sm font-black">예배 담당</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {([['guide', '예배안내'], ['cleanup', '뒷정리'], ['mealService', '식당봉사'], ['offeringMembers', '헌금위원'], ['offeringPrayer', '헌금기도']] as const).map(([key, label]) => <ReviewField key={key} label={label} value={journal.service[key]} onChange={(value) => updateService(key, value)} />)}
      </div>
    </section></details>

    <details open className="group/review border-b border-line"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black hover:bg-paper/50">기타사항 · 주보 광고<ChevronDown size={17} className="transition group-open/review:rotate-180" /></summary><section className="p-4">
      <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-black">기타사항 · 주보 광고</h3><p className="mt-1 text-xs text-ink/50">순서를 바꾸거나 필요 없는 광고를 삭제할 수 있습니다.</p></div><button type="button" className="journal-small-button" onClick={() => onChange({ ...journal, announcements: [...journal.announcements, ""] })}><Plus size={14} /> 광고 추가</button></div>
      <div className="grid gap-2">{journal.announcements.map((announcement, index) => <div key={index} className="grid grid-cols-[32px_1fr_auto] items-start gap-2 rounded border border-line bg-paper/35 p-2">
        <span className="pt-3 text-center font-display text-sm font-black text-brass">{index + 1}</span>
        <textarea className="journal-input bg-white leading-6" rows={announcementRows(announcement)} value={announcement} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.getData("text/plain").trim(); if (dropped) onChange({ ...journal, announcements: journal.announcements.map((item, itemIndex) => itemIndex === index ? dropped : item) }); }} onChange={(event) => onChange({ ...journal, announcements: journal.announcements.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />
        <div className="flex gap-1"><button type="button" className="grid size-9 place-items-center rounded border border-line" aria-label="광고 위로" onClick={() => moveAnnouncement(index, -1)}><ArrowUp size={14} /></button><button type="button" className="grid size-9 place-items-center rounded border border-line" aria-label="광고 아래로" onClick={() => moveAnnouncement(index, 1)}><ArrowDown size={14} /></button><button type="button" className="grid size-9 place-items-center rounded border border-line text-brick" aria-label="광고 삭제" onClick={() => onChange({ ...journal, announcements: journal.announcements.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /></button></div>
      </div>)}</div>
    </section></details>
  </article>;
}

export function WorshipJournalBuilder() {
  const [date, setDate] = useState(upcomingSunday);
  const [author, setAuthor] = useState("박기도");
  const [attendanceSheetUrl, setAttendanceSheetUrl] = useState(DEFAULT_ATTENDANCE_SHEET_URL);
  const [attendanceSheetReady, setAttendanceSheetReady] = useState(false);
  const [attendanceSheetTab, setAttendanceSheetTab] = useState("가장체크");
  const [bulletin, setBulletin] = useState<File | null>(null);
  const [accountingSourceType, setAccountingSourceType] = useState<"excel" | "google-sheet">("excel");
  const [accountingFile, setAccountingFile] = useState<File | null>(null);
  const [accountingSheetUrl, setAccountingSheetUrl] = useState(ACCOUNTING_SHEET);
  const [newFamilies, setNewFamilies] = useState<NewFamilyEntry[]>([blankNewFamily()]);
  const [graduates, setGraduates] = useState<GraduateEntry[]>([blankGraduate()]);
  const [journals, setJournals] = useState<WorshipJournal[]>([]);
  const [selected, setSelected] = useState<WorshipJournal | null>(null);
  const [preview, setPreview] = useState<WorshipJournal | null>(null);
  const [previewSignature, setPreviewSignature] = useState("");
  const [reviewDigest, setReviewDigest] = useState("");
  const [bulletinPreviewUrl, setBulletinPreviewUrl] = useState("");
  const [busyAction, setBusyAction] = useState<"preview" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishedValidation, setPublishedValidation] = useState<WorshipJournalValidationReport | null>(null);
  const [exportBusy, setExportBusy] = useState<"png" | "pdf" | null>(null);
  const [exportNotice, setExportNotice] = useState("");
  const actionLock = useRef(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJson<{ journals: WorshipJournal[] }>("/api/worship-journals").then((response) => {
      setJournals(response.journals); setSelected(response.journals[0] ?? null);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setAttendanceSheetUrl(readAttendanceSheetUrl());
    setAttendanceSheetReady(true);
  }, []);

  useEffect(() => {
    if (attendanceSheetReady) saveAttendanceSheetUrl(attendanceSheetUrl);
  }, [attendanceSheetReady, attendanceSheetUrl]);

  useEffect(() => {
    if (!bulletin || !bulletin.name.toLowerCase().endsWith(".pdf")) {
      setBulletinPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(bulletin);
    setBulletinPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bulletin]);

  const canRun = useMemo(() => Boolean(
    date
    && author.trim()
    && attendanceSheetUrl.trim()
    && attendanceSheetTab.trim()
    && bulletin
    && isAccountingSourceReady(accountingSourceType, accountingFile?.name ?? "", accountingSheetUrl)
  ), [accountingFile, accountingSheetUrl, accountingSourceType, attendanceSheetTab, attendanceSheetUrl, author, bulletin, date]);

  const currentSignature = useMemo(() => JSON.stringify({
    date, author, attendanceSheetUrl, attendanceSheetTab,
    bulletin: bulletin ? [bulletin.name, bulletin.size, bulletin.lastModified] : null,
    accountingSourceType,
    accountingFile: accountingFile ? [accountingFile.name, accountingFile.size, accountingFile.lastModified] : null,
    accountingSheetUrl,
    newFamilies,
    graduates
  }), [accountingFile, accountingSheetUrl, accountingSourceType, attendanceSheetTab, attendanceSheetUrl, author, bulletin, date, graduates, newFamilies]);
  const validation = useMemo(() => preview ? validateWorshipJournalForPublish(preview, date) : null, [date, preview]);

  function updateNewFamily(index: number, key: keyof NewFamilyEntry, value: string) {
    setNewFamilies((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  }
  function updateGraduate(index: number, key: keyof GraduateEntry, value: string) {
    setGraduates((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  }

  async function run(action: "preview" | "publish") {
    if (!bulletin || actionLock.current) return;
    actionLock.current = true;
    setBusyAction(action); setError(null); setSaved(false); setPublishedValidation(null);
    try {
      const body = new FormData();
      body.set("date", date); body.set("author", author); body.set("attendanceSheetUrl", attendanceSheetUrl);
      body.set("attendanceSheetTab", attendanceSheetTab); body.set("bulletin", bulletin); body.set("action", action);
      if (action === "publish") {
        body.set("reviewDigest", reviewDigest);
        body.set("reviewedJournal", JSON.stringify(preview));
      }
      body.set("accountingSourceType", accountingSourceType);
      if (accountingSourceType === "excel" && accountingFile) body.set("accountingFile", accountingFile);
      if (accountingSourceType === "google-sheet") body.set("accountingSheetUrl", accountingSheetUrl);
      body.set("newFamilies", JSON.stringify(newFamilies)); body.set("graduates", JSON.stringify(graduates));
      const response = await fetchJson<{ journal: WorshipJournal; reviewDigest?: string; validation?: WorshipJournalValidationReport; saved: boolean; published?: boolean }>("/api/worship-journals", { method: "POST", body });
      if (action === "preview") {
        setPreview(response.journal);
        setPreviewSignature(currentSignature);
        setReviewDigest(response.reviewDigest ?? "");
      } else {
        setSelected(response.journal);
        setPreview(null);
        setPreviewSignature("");
        setReviewDigest("");
        setJournals((current) => [response.journal, ...current.filter((journal) => journal.date !== response.journal.date)]);
        setPublishedValidation(response.validation ?? validation);
        setSaved(true);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "예배일지를 만들지 못했습니다.");
    } finally { actionLock.current = false; setBusyAction(null); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await run("preview");
  }

  async function renderExportCanvas() {
    if (!exportRef.current) throw new Error("내보낼 예배일지를 찾지 못했습니다.");
    await document.fonts.ready;
    const { toCanvas } = await import("html-to-image");
    return toCanvas(exportRef.current, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
      width: 1080,
      style: { position: "static", left: "auto", top: "auto", zIndex: "auto", pointerEvents: "auto" }
    });
  }

  async function exportJournal(format: "png" | "pdf") {
    if (!selected || exportBusy) return false;
    setExportBusy(format);
    setExportNotice("");
    try {
      const canvas = await renderExportCanvas();
      const stem = journalFileStem(selected);
      if (format === "png") {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG 변환에 실패했습니다.")), "image/png"));
        downloadBlob(blob, `${stem}.png`);
        setExportNotice("밴드에 바로 첨부할 한 장 이미지가 저장되었습니다.");
        return true;
      }
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const margin = 8;
      const usableWidth = 210 - margin * 2;
      const usableHeight = 297 - margin * 2;
      const sliceHeight = Math.floor(canvas.width * usableHeight / usableWidth);
      let top = 0;
      let pageIndex = 0;
      while (top < canvas.height) {
        const height = Math.min(sliceHeight, canvas.height - top);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = height;
        const context = slice.getContext("2d");
        if (!context) throw new Error("PDF 변환 화면을 만들지 못했습니다.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, slice.width, slice.height);
        context.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/jpeg", 0.94), "JPEG", margin, margin, usableWidth, height * usableWidth / canvas.width, undefined, "FAST");
        top += height;
        pageIndex += 1;
      }
      pdf.save(`${stem}.pdf`);
      setExportNotice(`PDF ${pageIndex}쪽이 저장되었습니다.`);
      return true;
    } catch (exportError) {
      setExportNotice(exportError instanceof Error ? exportError.message : "파일을 만들지 못했습니다.");
      return false;
    } finally {
      setExportBusy(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-5">
        <details open={!preview} className="group/setup rounded-xl border border-line bg-white"><summary className="flex cursor-pointer list-none items-center justify-between p-5"><span><strong className="block">자료 선택·기본 정보</strong><span className="text-xs text-ink/50">{displayDate(date)} · {author} · {preview ? "자료를 변경하려면 펼치세요" : "자료를 선택한 뒤 검토를 시작하세요"}</span></span><ChevronDown size={18} className="group-open/setup:rotate-180" /></summary><form onSubmit={submit} className="grid gap-4">
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
            <label className="group flex cursor-pointer items-center justify-between gap-3 rounded border border-dashed border-sea/40 bg-sea/5 px-4 py-4 transition hover:bg-sea/10"><span className="min-w-0"><span className="block text-sm font-black">HWP 또는 PDF 파일 선택</span><span className="block truncate text-xs text-ink/50">{bulletin?.name ?? "둘 중 한 파일만 선택하면 됩니다. PDF 글자는 자동 교정하지 않습니다."}</span></span><span className="rounded bg-sea px-3 py-2 text-xs font-black text-white">파일 찾기</span><input className="sr-only" type="file" accept=".hwp,.pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => setBulletin(event.target.files?.[0] ?? null)} /></label>
            {bulletinPreviewUrl ? <p className="mt-3 rounded border border-sea/20 bg-sea/5 px-3 py-2 text-xs text-sea">PDF 원본은 분석 후 원문 자료의 주보 탭에서 볼 수 있습니다.</p> : null}
          </div></section>

          <section className="journal-input-card"><div className="journal-step">04</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2"><FileSpreadsheet size={18} className="text-brass" /><h2 className="font-display text-xl font-bold">회계 자료</h2></div>
            <div className="mb-3 inline-grid grid-cols-2 rounded border border-line bg-paper/70 p-1" role="tablist" aria-label="회계 자료 입력 방식">
              <button type="button" role="tab" aria-selected={accountingSourceType === "excel"} className={`rounded px-4 py-2 text-sm font-black transition ${accountingSourceType === "excel" ? "bg-ink text-paper shadow" : "text-ink/55 hover:text-ink"}`} onClick={() => setAccountingSourceType("excel")}>엑셀 파일</button>
              <button type="button" role="tab" aria-selected={accountingSourceType === "google-sheet"} className={`rounded px-4 py-2 text-sm font-black transition ${accountingSourceType === "google-sheet" ? "bg-ink text-paper shadow" : "text-ink/55 hover:text-ink"}`} onClick={() => setAccountingSourceType("google-sheet")}>Google Sheet</button>
            </div>
            {accountingSourceType === "excel" ? <label className="group flex cursor-pointer items-center justify-between gap-3 rounded border border-dashed border-brass/50 bg-brass/5 px-4 py-4 transition hover:bg-brass/10"><span className="min-w-0"><span className="block text-sm font-black">회계 엑셀 선택</span><span className="block truncate text-xs text-ink/50">{accountingFile?.name ?? "XLSX 또는 XLS 파일을 올려주세요."}</span></span><span className="rounded bg-brass px-3 py-2 text-xs font-black text-ink">파일 찾기</span><input className="sr-only" type="file" accept=".xlsx,.xls" onChange={(event: ChangeEvent<HTMLInputElement>) => setAccountingFile(event.target.files?.[0] ?? null)} /></label> : <label className="journal-label">회계 Google Sheet 링크<input className="journal-input" type="url" value={accountingSheetUrl} onChange={(event) => setAccountingSheetUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." /></label>}
            <p className="mt-2 text-xs leading-5 text-ink/50">날짜와 관계없이 파일의 가장 오른쪽 탭을 최신 회계 자료로 읽습니다. 분석 후 선택된 탭 이름을 확인할 수 있습니다.</p>
          </div></section>

          <section className="journal-input-card"><div className="journal-step">05</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UserPlus size={18} className="text-brick" /><h2 className="font-display text-xl font-bold">새가족 수기 입력</h2></div><button type="button" className="journal-small-button" onClick={() => setNewFamilies((current) => [...current, blankNewFamily()])}><Plus size={14} /> 추가</button></div>
            <div className="grid gap-2">{newFamilies.map((entry, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/45 p-3 sm:grid-cols-[1fr_85px_1fr_1fr_1fr_auto]">
              <input className="journal-input" placeholder="이름" value={entry.name} onChange={(event) => updateNewFamily(index, "name", event.target.value)} /><input className="journal-input" placeholder="대수" value={entry.generation} onChange={(event) => updateNewFamily(index, "generation", event.target.value)} /><input className="journal-input" placeholder="인도자" value={entry.inviter} onChange={(event) => updateNewFamily(index, "inviter", event.target.value)} /><input className="journal-input" placeholder="관계" value={entry.relationship} onChange={(event) => updateNewFamily(index, "relationship", event.target.value)} /><input className="journal-input" placeholder="기타" value={entry.note} onChange={(event) => updateNewFamily(index, "note", event.target.value)} /><button type="button" className="grid size-10 place-items-center rounded border border-line text-ink/45 hover:border-brick hover:text-brick" aria-label="새가족 행 삭제" onClick={() => setNewFamilies((current) => current.length === 1 ? [blankNewFamily()] : current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
            </div>)}</div>
          </div></section>

          <section className="journal-input-card"><div className="journal-step">06</div><div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users size={18} className="text-moss" /><h2 className="font-display text-xl font-bold">수료자(등반)</h2></div><button type="button" className="journal-small-button" onClick={() => setGraduates((current) => [...current, blankGraduate()])}><Plus size={14} /> 추가</button></div>
            <div className="grid gap-2">{graduates.map((entry, index) => <div key={index} className="grid gap-2 rounded border border-line bg-paper/45 p-3 sm:grid-cols-[1fr_100px_1fr_auto]">
              <input className="journal-input" placeholder="이름" value={entry.name} onChange={(event) => updateGraduate(index, "name", event.target.value)} /><input className="journal-input" placeholder="대수" value={entry.generation} onChange={(event) => updateGraduate(index, "generation", event.target.value)} /><input className="journal-input" placeholder="등반 가족" value={entry.family} onChange={(event) => updateGraduate(index, "family", event.target.value)} /><button type="button" className="grid size-10 place-items-center rounded border border-line text-ink/45 hover:border-brick hover:text-brick" aria-label="수료자 행 삭제" onClick={() => setGraduates((current) => current.length === 1 ? [blankGraduate()] : current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
            </div>)}</div>
          </div></section>

          <button type="submit" disabled={!canRun || busyAction !== null} className="group relative flex min-h-16 items-center justify-center gap-3 overflow-hidden rounded bg-ink px-6 text-base font-black text-paper shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"><span className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-[110%]" />{busyAction === "preview" ? <LoaderCircle size={20} className="animate-spin" /> : <SearchCheck size={20} />}{busyAction === "preview" ? "자료를 읽는 중…" : "1단계 · 추출 결과 검토"}</button>
        </form></details>
        {error ? <section role="alert" className="rounded-xl border-2 border-brick/40 bg-brick/10 p-5 text-brick"><p className="text-lg font-black">제출을 완료하지 못했습니다</p><p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6">{error}</p><p className="mt-2 text-xs text-ink/55">이번 요청은 완료 처리되지 않았습니다. 아래 내용을 수정한 뒤 다시 제출할 수 있습니다.</p></section> : null}
        {saved && selected?.outputSheet ? <section className="rounded-xl border-2 border-sea/40 bg-sea/10 p-5 shadow-lg" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xl font-black text-sea"><Check size={24} /> 예배일지 생성 완료</p><p className="mt-2 text-sm font-bold">{displayDate(selected.date)} · Google Sheet <strong>{selected.outputSheet.sheetTitle}</strong> 탭</p></div><a className="flex items-center gap-2 rounded bg-sea px-4 py-3 text-sm font-black text-white" href={selected.outputSheet.url} target="_blank" rel="noreferrer">생성된 탭 열기 <ExternalLink size={16} /></a></div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p className="rounded bg-white/70 p-3"><strong>출석</strong><br />1~3부 {selected.attendance.service13} · 4부 {selected.attendance.service4} · 가족모임 {selected.attendance.familyMeeting}</p><p className="rounded bg-white/70 p-3"><strong>회계</strong><br />총 {selected.accounting?.total.toLocaleString("ko-KR") ?? 0}원 · 감사 {selected.accounting?.thanksgiving.length ?? 0}건</p><p className="rounded bg-white/70 p-3"><strong>저장 후 재검증</strong><br />{selected.outputSheet.verification?.checkedCells ?? 0}개 셀 일치 확인</p></div>
          {selected.outputSheet.verification?.stages?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{selected.outputSheet.verification.stages.map((stage) => <p key={stage.label} className="rounded border border-sea/20 bg-white/70 p-3 text-xs"><strong className="text-sea">✓ {stage.label}</strong><br /><span className="mt-1 inline-block text-ink/60">{stage.detail}</span></p>)}</div> : null}
          <p className="mt-3 text-xs font-bold text-sea">제출 전 검증 {publishedValidation?.passed ?? 0}/{publishedValidation?.total ?? 0} 통과 · Google Sheet에 쓴 값을 다시 읽어 일치 여부까지 확인했습니다.</p>
        </section> : null}
        {!preview && selected ? <div className="grid gap-4"><section className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-lg font-black">PDF · 이미지</h3><p className="mt-1 text-xs leading-5 text-ink/55">PDF는 A4 여러 쪽으로, PNG는 BAND 첨부용 한 장으로 저장합니다.</p></div><div className="flex flex-wrap gap-2">
            <button type="button" disabled={exportBusy !== null} onClick={() => exportJournal("pdf")} className="journal-small-button">{exportBusy === "pdf" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PDF 저장</button>
            <button type="button" disabled={exportBusy !== null} onClick={() => exportJournal("png")} className="journal-small-button">{exportBusy === "png" ? <LoaderCircle size={14} className="animate-spin" /> : <ImageIcon size={14} />} 한 장 이미지</button>
          </div></div>
          {exportNotice ? <p className="mt-3 rounded bg-paper/70 px-3 py-2 text-xs font-bold text-sea" aria-live="polite">{exportNotice}</p> : null}
        </section><BandPublishCard content={worshipJournalBandText(selected)} onPrepareImage={async () => { const saved = await exportJournal("png"); if (!saved) throw new Error("한 장 이미지를 저장하지 못했습니다."); }} /></div> : null}
        {preview ? <div className="grid gap-4">
          {previewSignature !== currentSignature ? <div className="rounded border border-brass/40 bg-brass/10 p-4 text-sm font-bold">입력값이 변경되었습니다. 다시 분석한 뒤 생성해 주세요.</div> : null}
          <div className="grid min-w-0 items-start gap-5 2xl:grid-cols-[minmax(360px,0.85fr)_minmax(580px,1.15fr)]"><WorshipJournalSources pdfUrl={bulletinPreviewUrl} bulletinName={bulletin?.name} evidence={preview.extraction?.evidenceLines} accountingFile={accountingSourceType === "excel" ? accountingFile : null} accountingUrl={accountingSheetUrl} attendanceUrl={attendanceSheetUrl} attendanceTab={attendanceSheetTab} accountingTab={preview.accounting?.sheetTab} /><WorshipJournalReviewEditor journal={preview} onChange={setPreview} /></div>
          {validation ? <section className={`rounded-xl border-2 p-4 ${validation.ok ? "border-sea/35 bg-sea/5" : "border-brick/35 bg-brick/5"}`}><div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-black">제출 전 최종 검증</h3><strong className={validation.ok ? "text-sea" : "text-brick"}>{validation.passed}/{validation.total} 통과</strong></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{validation.checks.map((check) => <div key={check.id} className="rounded border border-line bg-white p-3 text-xs"><p className={`flex items-center gap-2 font-black ${check.ok ? "text-sea" : "text-brick"}`}><Check size={14} /> {check.label}</p><p className="mt-1 leading-5 text-ink/55">{check.detail}</p></div>)}</div></section> : null}
          <button type="button" disabled={previewSignature !== currentSignature || !reviewDigest || !validation?.ok || busyAction !== null} onClick={() => run("publish")} className="sticky bottom-4 z-20 flex min-h-16 items-center justify-center gap-3 rounded-xl bg-sea px-6 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">{busyAction === "publish" ? <LoaderCircle size={20} className="animate-spin" /> : <Save size={20} />}{busyAction === "publish" ? "4단계 검증 · 원본 재조회 · 생성 결과 대조 중…" : validation?.ok ? `최종 제출 · 검증 ${validation.passed}/${validation.total} 통과` : "최종 검증 항목을 먼저 수정해 주세요"}</button>
        </div> : selected ? <JournalPreview journal={selected} /> : null}
      </div>

      <aside className="min-w-0"><div className="grid gap-4 md:grid-cols-2">
        <section className="overflow-hidden rounded border border-line bg-ink text-paper shadow-xl"><div className="border-b border-white/10 px-5 py-5"><div className="flex items-center gap-2 text-brass"><Sparkles size={17} /><p className="text-xs font-black tracking-[0.18em]">REVIEW FIRST JOURNAL</p></div><h2 className="mt-3 font-display text-2xl font-bold">원문을 확인한 뒤<br />예배일지 탭을 만듭니다.</h2></div><div className="grid gap-3 px-5 py-5 text-sm text-paper/70">{["HWP 또는 텍스트형 PDF 하나", "출석 시트 3종·가족별 자동 집계", "회계 파일 또는 Google Sheet 하나", "이름 자동 교정·유사 이름 추정 금지", "같은 날짜 탭 덮어쓰기 차단"].map((item) => <p key={item} className="flex items-center gap-2"><Check size={14} className="text-brass" />{item}</p>)}</div></section>
        <section className="rounded border border-line bg-white/75 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><History size={17} /> 저장된 일지</h2><span className="text-xs font-black text-ink/40">{journals.length}</span></div><div className="grid max-h-[430px] gap-2 overflow-y-auto pr-1">{journals.length ? journals.map((journal) => <button key={journal.id} type="button" onClick={() => setSelected(journal)} className={`group flex items-center justify-between gap-3 rounded border px-3 py-3 text-left transition ${selected?.id === journal.id ? "border-sea bg-sea/10" : "border-line bg-white hover:border-ink/30"}`}><span className="min-w-0"><span className="block truncate text-sm font-black">{displayDate(journal.date)}</span><span className="mt-1 block truncate text-xs text-ink/45">{journal.sermon.title || journal.source.bulletinFileName || journal.source.hwpFileName}</span></span><ChevronRight size={15} className="shrink-0 text-ink/30 transition group-hover:translate-x-0.5" /></button>) : <div className="rounded border border-dashed border-line p-5 text-center text-xs text-ink/45"><BookOpenCheck className="mx-auto mb-2" size={22} />아직 저장된 예배일지가 없습니다.</div>}</div></section>
      </div></aside>
      {selected ? <div ref={exportRef} aria-hidden="true" style={{ position: "fixed", left: "-12000px", top: 0, width: 1080, zIndex: -1, pointerEvents: "none" }}><JournalPreview journal={selected} exportMode /></div> : null}
    </div>
  );
}
