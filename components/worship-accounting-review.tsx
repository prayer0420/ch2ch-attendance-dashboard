"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { JournalAccounting, ThanksgivingOffering } from "@/lib/worship-journal-accounting";

export function WorshipAccountingReview({ accounting, onChange }: { accounting: JournalAccounting; onChange: (value: JournalAccounting) => void }) {
  const section = "thanksgiving";
  const [query, setQuery] = useState("");
  const entries = accounting[section] ?? [];
  const sorted = entries.map((offering, index) => ({offering, index})).sort((a, b) =>
    (section === "thanksgiving" ? Number(Boolean(b.offering.note.trim())) - Number(Boolean(a.offering.note.trim())) : 0)
    || a.offering.name.trim().localeCompare(b.offering.name.trim(), "ko-KR"));
  const visible = sorted.filter(({offering}) => !query.trim() || `${offering.name} ${offering.note}`.includes(query.trim()));
  function update(next: ThanksgivingOffering[]) {
    const updated = {...accounting, [section]:next};
    const totalKey = `${section}Total` as "sundayTotal" | "thanksgivingTotal" | "purposeTotal";
    updated[totalKey] = next.reduce((sum, entry) => sum + entry.amount, 0);
    updated.total = updated.sundayTotal + updated.thanksgivingTotal + updated.purposeTotal;
    onChange(updated);
  }
  return <div className="space-y-4">
    <p className="rounded-lg border border-sea/20 bg-sea/5 px-3 py-2 text-sm text-sea">읽은 회계 탭: <strong>{accounting.sheetTab}</strong> · 파일의 가장 오른쪽 탭</p>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="rounded-lg border border-line bg-white p-3 text-xs font-bold">주일헌금액 (원)<input aria-label="주일헌금액" className="journal-input mt-2 tabular-nums" type="number" min={0} value={accounting.sundayTotal} onChange={event=>{const sundayTotal=Math.max(0,Number(event.target.value)||0);onChange({...accounting,sundayTotal,total:sundayTotal+accounting.thanksgivingTotal+accounting.purposeTotal});}} /></label>
      <div className="rounded-lg border border-line bg-white p-3"><span className="text-xs font-bold">감사헌금액</span><strong className="mt-3 block tabular-nums">{accounting.thanksgivingTotal.toLocaleString("ko-KR")}원</strong></div>
      <div className="rounded-lg border border-sea/30 bg-sea/10 p-3"><span className="text-xs font-bold">총액</span><strong className="mt-3 block tabular-nums">{accounting.total.toLocaleString("ko-KR")}원</strong></div>
    </div>
    <h4 className="text-sm font-bold">감사헌금 명단</h4>
    <div className="flex flex-wrap items-center justify-between gap-2"><label className="min-w-40 flex-1"><span className="sr-only">헌금 명단 검색</span><input className="journal-input" value={query} onChange={event=>setQuery(event.target.value)} placeholder="이름·감사내용 검색" /></label><button type="button" className="journal-small-button" onClick={()=>{setQuery("");update([...entries,{name:"",amount:0,note:""}]);}}><Plus size={14}/> 명단 추가</button></div>
    <p className="text-xs text-ink/60">{section === "thanksgiving" ? "온라인·현장 통합 · 감사내용 있는 분 먼저, 각 그룹 가나다순" : "온라인·현장 통합 · 가나다순"} · {visible.length}/{entries.length}건</p>
    <div className="space-y-2">
      <div className="hidden grid-cols-[minmax(90px,1fr)_110px_minmax(160px,2fr)_36px] gap-2 px-3 text-xs font-bold text-ink/60 sm:grid"><span>이름</span><span>금액 (원)</span><span>{section === "thanksgiving" ? "감사내용" : "내용"}</span><span/></div>
      {visible.map(({offering,index},position)=><div key={index}>
        {section === "thanksgiving" && (position===0 || Boolean(visible[position-1].offering.note.trim())!==Boolean(offering.note.trim())) ? <h4 className="mb-2 mt-4 rounded bg-paper px-3 py-2 text-xs font-bold">{offering.note.trim() ? "감사내용 있는 분" : "감사내용 없는 분"}</h4> : null}
        <div className="grid items-start gap-2 rounded-lg border border-line bg-white p-3 sm:grid-cols-[minmax(90px,1fr)_110px_minmax(160px,2fr)_36px]">
          <input aria-label={`${index+1}번째 ${section} 이름`} className="journal-input min-w-0" value={offering.name} placeholder="이름" onChange={event=>update(entries.map((entry,i)=>i===index?{...entry,name:event.target.value}:entry))}/>
          <input aria-label={`${index+1}번째 ${section} 금액`} className="journal-input min-w-0 tabular-nums" type="number" min={0} value={offering.amount} onChange={event=>update(entries.map((entry,i)=>i===index?{...entry,amount:Math.max(0,Number(event.target.value)||0)}:entry))}/>
          <textarea aria-label={`${index+1}번째 ${section} 내용`} className="journal-input min-w-0 resize-y leading-6" rows={offering.note?3:1} value={offering.note} placeholder="내용 없음" onChange={event=>update(entries.map((entry,i)=>i===index?{...entry,note:event.target.value}:entry))}/>
          <button type="button" aria-label={`${offering.name||"빈 명단"} 삭제`} className="grid size-9 place-items-center rounded border border-line text-brick" onClick={()=>update(entries.filter((_,i)=>i!==index))}><Trash2 size={14}/></button>
        </div>
      </div>)}
      {!visible.length ? <p className="rounded border border-dashed border-line p-5 text-center text-sm text-ink/50">{query ? "검색 결과가 없습니다." : "이 종류의 헌금 명단이 없습니다."}</p> : null}
    </div>
  </div>;
}
