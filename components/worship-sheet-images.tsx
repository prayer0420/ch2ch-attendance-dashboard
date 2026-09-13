"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkBook, WorkSheet } from "xlsx";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";

const ROWS = 22;
const COLS = 10;

function bounds(sheet: WorkSheet) {
  let lastRow = 0, lastCol = 0;
  for (const address of Object.keys(sheet)) {
    if (address.startsWith("!") || sheet[address]?.v === undefined || sheet[address]?.v === "") continue;
    const match = /^([A-Z]+)(\d+)$/.exec(address);
    if (!match) continue;
    let column = 0;
    for (const char of match[1]) column = column * 26 + char.charCodeAt(0) - 64;
    lastRow = Math.max(lastRow, Number(match[2])); lastCol = Math.max(lastCol, column);
  }
  return { rows: Math.max(1,lastRow), cols: Math.max(1,lastCol) };
}

async function renderSheet(sheet: WorkSheet, rowPage: number, colPage: number) {
  const xlsx = await import("xlsx");
  const limit = bounds(sheet);
  const r0 = rowPage * ROWS, c0 = colPage * COLS;
  const r1 = Math.min(limit.rows, r0 + ROWS), c1 = Math.min(limit.cols, c0 + COLS);
  const scratch = document.createElement("canvas").getContext("2d")!;
  scratch.font = "14px Arial, 'Malgun Gothic', sans-serif";
  function lines(text: string, width: number) {
    const result: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
      let line = "";
      for (const char of paragraph) {
        if (line && scratch.measureText(line + char).width > width) {result.push(line); line = "";}
        line += char;
      }
      result.push(line);
    }
    return result;
  }
  const widths = Array.from({length:c1-c0},(_,i)=>{
    const c=c0+i;
    let width = Math.max(65,Math.min(220,sheet["!cols"]?.[c]?.wpx ?? 105));
    for(let r=r0;r<r1;r++) {
      const cell=sheet[xlsx.utils.encode_cell({r,c})];
      if(String(cell?.w ?? cell?.v ?? "").length>35) width=Math.max(width,260);
    }
    return width;
  });
  const xs=[44]; widths.forEach(width=>xs.push(xs.at(-1)!+width));
  const heights=Array.from({length:r1-r0},(_,i)=>Math.max(32,sheet["!rows"]?.[r0+i]?.hpx ?? 32));
  const drawCells: Array<{r:number;c:number;endR:number;endC:number;text:string;fill:string;numeric:boolean}> = [];
  for(let r=r0;r<r1;r++) for(let c=c0;c<c1;c++) {
    const merge=sheet["!merges"]?.find(m=>r>=m.s.r&&r<=m.e.r&&c>=m.s.c&&c<=m.e.c);
    if(merge&&(r!==Math.max(r0,merge.s.r)||c!==Math.max(c0,merge.s.c)))continue;
    const cell=sheet[xlsx.utils.encode_cell(merge?.s??{r,c})];
    const text=typeof cell?.v==="boolean" ? (cell.v?"☑":"☐") : String(cell?.w??cell?.v??"");
    const endR=Math.min(r1,merge?merge.e.r+1:r+1),endC=Math.min(c1,merge?merge.e.c+1:c+1);
    const needed=lines(text,xs[endC-c0]-xs[c-c0]-16).length*21+16;
    const existing=heights.slice(r-r0,endR-r0).reduce((a,b)=>a+b,0);
    if(needed>existing)heights[endR-r0-1]+=needed-existing;
    const color=cell?.s?.fgColor?.rgb ?? cell?.s?.fill?.fgColor?.rgb;
    drawCells.push({r,c,endR,endC,text,fill:typeof color==="string"&&/^[A-Fa-f0-9]{6,8}$/.test(color)?`#${color.slice(-6)}`:"#ffffff",numeric:typeof cell?.v==="number"});
  }
  const ys=[32];heights.forEach(height=>ys.push(ys.at(-1)!+height));
  const canvas=document.createElement("canvas");
  const width=xs.at(-1)!+1,height=ys.at(-1)!+1;
  if(width*height>12_000_000)throw new Error("원문 구간의 내용이 너무 큽니다. 원본 크게 열기로 확인해 주세요.");
  canvas.width=width*2;canvas.height=height*2;
  const ctx=canvas.getContext("2d")!;ctx.scale(2,2);ctx.fillStyle="#f3f1eb";ctx.fillRect(0,0,width,height);ctx.font=scratch.font;ctx.textBaseline="top";
  ctx.fillStyle="#53606a";
  for(let c=c0;c<c1;c++)ctx.fillText(xlsx.utils.encode_col(c),xs[c-c0]+8,8);
  for(let r=r0;r<r1;r++)ctx.fillText(String(r+1),7,ys[r-r0]+8);
  for(const cell of drawCells){
    const x=xs[cell.c-c0],y=ys[cell.r-r0],w=xs[cell.endC-c0]-x,h=ys[cell.endR-r0]-y;
    ctx.fillStyle=cell.fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle="#c6cbc9";ctx.strokeRect(x+.5,y+.5,w,h);ctx.fillStyle="#17262c";
    lines(cell.text,w-16).forEach((line,i)=>ctx.fillText(line,cell.numeric?x+w-8-ctx.measureText(line).width:x+8,y+8+i*21));
  }
  return {url:canvas.toDataURL("image/png"),range:`${xlsx.utils.encode_cell({r:r0,c:c0})}:${xlsx.utils.encode_cell({r:r1-1,c:c1-1})}`};
}

export function WorshipSheetImages({file,url,kind,preferredTab}:{file?:File|null;url?:string;kind:"accounting"|"attendance";preferredTab?:string}) {
  const [workbook,setWorkbook]=useState<WorkBook|null>(null),[selected,setSelected]=useState("");
  const [rowPage,setRowPage]=useState(0),[colPage,setColPage]=useState(0),[zoom,setZoom]=useState(100),[full,setFull]=useState(false);
  const [image,setImage]=useState<{url:string;range:string}|null>(null),[error,setError]=useState("");
  useEffect(()=>{
    let active=true; const abort=new AbortController();setWorkbook(null);setImage(null);setError("");
    (async()=>{
      const xlsx=await import("xlsx");
      let buffer:ArrayBuffer;
      if(file) buffer=await file.arrayBuffer();
      else {const response=await fetch(`/api/worship-journals/source?kind=${kind}&url=${encodeURIComponent(url??"")}`,{signal:abort.signal});if(!response.ok)throw Error((await response.json()).error||"원문을 읽지 못했습니다.");buffer=await response.arrayBuffer();}
      const book=xlsx.read(buffer,{type:"array",cellStyles:true});
      if(active){setWorkbook(book);setSelected(preferredTab&&book.Sheets[preferredTab]?preferredTab:book.SheetNames[0]??"");setRowPage(0);setColPage(0);}
    })().catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;abort.abort();};
  },[file,url,kind,preferredTab]);
  useEffect(()=>{
    let active=true;setImage(null);
    if(workbook?.Sheets[selected])renderSheet(workbook.Sheets[selected],rowPage,colPage).then(value=>{if(active)setImage(value);}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[workbook,selected,rowPage,colPage]);
  useEffect(()=>{if(!full)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setFull(false);};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[full]);
  const size=workbook?.Sheets[selected]?bounds(workbook.Sheets[selected]):{rows:1,cols:1};
  const panel = <div role={full?"dialog":undefined} aria-modal={full||undefined} aria-label={full?"원문 이미지 크게 보기":undefined} className={full?"fixed inset-4 z-[100] flex flex-col rounded-xl border border-line bg-white p-3 shadow-2xl":"flex h-full min-h-0 flex-col"}>
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white p-3 text-xs">
      <label className="flex items-center gap-2">시트<select aria-label="원문 시트 선택" value={selected} onChange={event=>{setSelected(event.target.value);setRowPage(0);setColPage(0);setError("");}} className="max-w-40 rounded border border-line p-2">{workbook?.SheetNames.map(name=><option key={name}>{name}</option>)}</select></label>
      <button type="button" aria-label="원문 축소" className="journal-small-button" onClick={()=>setZoom(Math.max(50,zoom-25))}><Minus size={14}/></button><span>{zoom}%</span><button type="button" aria-label="원문 확대" className="journal-small-button" onClick={()=>setZoom(Math.min(300,zoom+25))}><Plus size={14}/></button>
      <button type="button" aria-label={full?"크게 보기 닫기":"원문 이미지 크게 보기"} className="journal-small-button" onClick={()=>setFull(!full)}>{full?<X size={14}/>:<Maximize2 size={14}/>}</button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs">
      <span>원본 셀·병합 이미지 {image?.range}</span>
      <div className="flex items-center gap-2"><button type="button" aria-label="이전 행 구간" disabled={!rowPage} onClick={()=>setRowPage(rowPage-1)} className="disabled:opacity-30"><ChevronLeft size={18}/></button><span>세로 {rowPage+1}/{Math.ceil(size.rows/ROWS)}</span><button type="button" aria-label="다음 행 구간" disabled={(rowPage+1)*ROWS>=size.rows} onClick={()=>setRowPage(rowPage+1)} className="disabled:opacity-30"><ChevronRight size={18}/></button></div>
      {size.cols>COLS?<div className="flex items-center gap-2"><button type="button" aria-label="이전 열 구간" disabled={!colPage} onClick={()=>setColPage(colPage-1)} className="disabled:opacity-30"><ChevronLeft size={18}/></button><span>가로 {colPage+1}/{Math.ceil(size.cols/COLS)}</span><button type="button" aria-label="다음 열 구간" disabled={(colPage+1)*COLS>=size.cols} onClick={()=>setColPage(colPage+1)} className="disabled:opacity-30"><ChevronRight size={18}/></button></div>:null}
    </div>
    <div className="min-h-0 flex-1 overflow-auto bg-ink/5 p-2">{error?<p role="alert" className="p-4 text-sm text-brick">{error}</p>:image?<img src={image.url} alt={`${selected} 원본 이미지 ${image.range}`} style={{width:`${zoom}%`,maxWidth:"none"}} className="h-auto rounded shadow-sm"/>:<p className="p-4 text-sm text-ink/50">원문 이미지를 만드는 중…</p>}</div>
  </div>;
  return full ? createPortal(panel, document.body) : panel;
}
