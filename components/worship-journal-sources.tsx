"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";
import { WorshipSheetImages } from "@/components/worship-sheet-images";

function safeGoogleUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["docs.google.com", "drive.google.com"].includes(url.hostname) ? url.href : "";
  } catch { return ""; }
}

export function WorshipJournalSources({ pdfUrl, bulletinName, evidence, accountingFile, accountingUrl, attendanceUrl, accountingTab, attendanceTab }: {
  pdfUrl?: string; bulletinName?: string; evidence?: string[]; accountingFile: File | null; accountingUrl: string; attendanceUrl: string; accountingTab?: string; attendanceTab?: string;
}) {
  const [tab, setTab] = useState<"bulletin" | "accounting" | "attendance">("bulletin");
  const url = safeGoogleUrl(tab === "accounting" ? accountingUrl : attendanceUrl);
  return <details open className="group/source overflow-hidden rounded-xl border border-line bg-white shadow-sm lg:sticky lg:top-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4"><span><strong className="block text-sm">원문 자료</strong><span className="text-xs text-ink/50">탭을 바꿔가며 입력값과 비교하세요</span></span><ChevronDown size={18} className="transition group-open/source:rotate-180" /></summary>
    <div className="flex border-y border-line bg-paper/50 p-1" role="tablist" aria-label="원문 자료">{([["bulletin", "주보"], ["accounting", "회계"], ["attendance", "출석 시트"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} aria-controls="journal-source-panel" className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold ${tab === key ? "bg-sea text-white shadow-sm" : "text-ink/60 hover:bg-white"}`} onClick={() => setTab(key)}>{label}</button>)}</div>
    <div id="journal-source-panel" role="tabpanel" aria-label={`${tab === "bulletin" ? "주보" : tab === "accounting" ? "회계" : "출석 시트"} 원문`} className="flex h-[65vh] min-h-[380px] flex-col bg-white">
      {tab === "bulletin" ? <><div className="flex items-center justify-between gap-2 border-b border-line p-3 text-xs"><span className="truncate">{bulletinName || "주보 원문"}</span>{pdfUrl ? <a className="flex shrink-0 items-center gap-1 font-bold text-sea" href={pdfUrl} target="_blank" rel="noreferrer">크게 열기<ExternalLink size={13} /></a> : null}</div>{pdfUrl ? <iframe title="주보 PDF 원본" src={pdfUrl} className="min-h-0 w-full flex-1 border-0" /> : <div className="overflow-auto p-4"><p className="mb-3 text-xs text-ink/50">HWP에서 읽은 원문 텍스트입니다.</p><pre className="whitespace-pre-wrap font-sans text-sm leading-7">{evidence?.join("\n") || "주보를 선택하고 분석하면 원문이 표시됩니다."}</pre></div>}</> : tab === "accounting" && accountingFile ? <WorshipSheetImages file={accountingFile} kind="accounting" preferredTab={accountingTab} /> : url ? <><div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3 text-xs"><span className="text-ink/50">원문을 이미지로 보며 확대·구간 이동할 수 있습니다.</span><a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-sea">원본 크게 열기<ExternalLink size={13} /></a></div><WorshipSheetImages key={url} url={url} kind={tab === "accounting" ? "accounting" : "attendance"} preferredTab={tab === "accounting" ? accountingTab : attendanceTab} /></> : <p className="p-4 text-sm text-ink/50">자료 링크를 입력해 주세요.</p>}
    </div>
  </details>;
}
