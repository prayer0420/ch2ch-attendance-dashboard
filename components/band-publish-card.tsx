"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Eye, EyeOff, Image as ImageIcon, LoaderCircle, Radio, Send, Unplug, X } from "lucide-react";

const TOKEN_STORAGE_KEY = "ch2ch.band.access-token";
const FALLBACK_TARGET_NAME = "2026 임원밴드";

type BandStatus = {
  ready: boolean;
  targetName: string;
  message: string;
  memberCount?: number;
  bandKey?: string;
  bandUrl?: string;
};

type Props = {
  content: string;
  onPrepareImage?: () => Promise<void>;
};

export function BandPublishCard({ content, onPrepareImage }: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<BandStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [draft, setDraft] = useState(content);
  const [notice, setNotice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    setDraft(content);
  }, [content]);

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    setAccessToken(saved);
    void checkConnection(saved, false);
    // Initial connection check only runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkConnection(token = accessToken, save = true) {
    setChecking(true);
    setNotice("");
    try {
      const response = await fetch("/api/band/status", {
        method: token.trim() ? "POST" : "GET",
        headers: token.trim() ? { "Content-Type": "application/json" } : undefined,
        body: token.trim() ? JSON.stringify({ accessToken: token.trim() }) : undefined,
        cache: "no-store",
      });
      const data = await response.json() as BandStatus;
      setStatus(data);
      if (data.ready && token.trim() && save) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
        setNotice("이 PC의 브라우저에 인증값을 저장하고 연결을 확인했습니다.");
      } else if (!data.ready) {
        setNotice(data.message);
      }
    } catch (error) {
      setStatus({ ready: false, targetName: FALLBACK_TARGET_NAME, message: "BAND 연결 확인 요청에 실패했습니다." });
      setNotice(error instanceof Error ? error.message : "BAND 연결을 확인하지 못했습니다.");
    } finally {
      setChecking(false);
    }
  }

  function disconnect() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAccessToken("");
    setStatus(null);
    setNotice("이 PC에 저장한 BAND 인증값을 제거했습니다.");
  }

  async function prepareManualPost() {
    setNotice("");
    try {
      if (onPrepareImage) await onPrepareImage();
      await navigator.clipboard.writeText(draft);
      setNotice("한 장 이미지를 저장하고 게시글을 복사했습니다. BAND에서 이미지 첨부 후 붙여넣으세요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "BAND 게시 준비를 완료하지 못했습니다.");
    }
  }

  async function publishTextOnly() {
    if (!status?.ready || confirmText !== status.targetName || !draft.trim()) return;
    setPublishing(true);
    setNotice("");
    try {
      const response = await fetch("/api/band/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim() || undefined,
          content: draft,
          targetName: status.targetName,
          confirmed: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "BAND에 게시하지 못했습니다.");
      setConfirmOpen(false);
      setConfirmText("");
      setNotice(`본문 게시 완료 · 게시물 ${data.postKey}`);
      if (data.bandUrl) setStatus((current) => current ? { ...current, bandUrl: data.bandUrl } : current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "BAND에 게시하지 못했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm" aria-labelledby="band-publish-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-5 py-4 text-paper">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-brass">BAND CONNECTION</p>
          <h3 id="band-publish-title" className="mt-1 font-display text-lg font-black">예배일지 BAND 게시</h3>
        </div>
        <span className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${status?.ready ? "bg-sea text-white" : "bg-white/10 text-paper/80"}`}>
          {checking ? <LoaderCircle size={14} className="animate-spin" /> : status?.ready ? <Check size={14} /> : <Unplug size={14} />}
          {checking ? "확인 중" : status?.ready ? "연결됨" : "연결 필요"}
        </span>
      </header>

      <div className="grid gap-4 p-5">
        <div className="rounded border border-line bg-paper/55 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong>{status?.targetName ?? FALLBACK_TARGET_NAME}</strong>
              <p className="mt-1 text-xs leading-5 text-ink/55">{status?.message ?? "BAND access token을 입력하면 대상과 글쓰기 권한을 확인합니다."}</p>
            </div>
            {status?.bandUrl ? <a href={status.bandUrl} target="_blank" rel="noreferrer" className="journal-small-button"><ExternalLink size={14} /> BAND 열기</a> : null}
          </div>
        </div>

        {!status?.ready ? <div className="grid gap-3 rounded border border-brass/40 bg-brass/5 p-4">
          <label className="journal-label">BAND access token
            <span className="flex gap-2">
              <input className="journal-input min-w-0 flex-1 font-mono" type={showToken ? "text" : "password"} autoComplete="off" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="발급된 token을 여기에만 입력" />
              <button type="button" className="journal-small-button" onClick={() => setShowToken((value) => !value)} aria-label={showToken ? "인증값 숨기기" : "인증값 보기"}>{showToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="journal-small-button" disabled={checking || !accessToken.trim()} onClick={() => checkConnection()}>{checking ? <LoaderCircle size={14} className="animate-spin" /> : <Radio size={14} />} 연결 확인·이 PC에 저장</button>
            <a className="journal-small-button" href="https://developers.band.us/develop/myapps/list" target="_blank" rel="noreferrer"><ExternalLink size={14} /> BAND Developers</a>
          </div>
          <p className="flex gap-2 text-[11px] leading-5 text-ink/50"><AlertTriangle size={14} className="mt-0.5 shrink-0" />인증값은 Git이나 서버 DB에 저장하지 않고 이 브라우저에만 보관합니다. 공용 PC에서는 저장하지 마세요.</p>
        </div> : <button type="button" className="justify-self-start text-xs font-bold text-ink/45 underline" onClick={disconnect}>이 PC의 BAND 연결 해제</button>}

        <label className="journal-label">게시할 본문
          <textarea className="journal-input min-h-48 whitespace-pre-wrap leading-6" value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>

        <div className="grid gap-3 lg:grid-cols-2">
          <button type="button" className="flex min-h-14 items-center justify-center gap-2 rounded bg-sea px-4 font-black text-white disabled:opacity-40" disabled={!draft.trim()} onClick={prepareManualPost}><ImageIcon size={18} /> PNG 저장 + 글 복사</button>
          <button type="button" className="flex min-h-14 items-center justify-center gap-2 rounded border-2 border-ink px-4 font-black disabled:opacity-40" disabled={!status?.ready || !draft.trim()} onClick={() => setConfirmOpen(true)}><Send size={18} /> 본문만 자동 게시</button>
        </div>
        <p className="text-[11px] leading-5 text-ink/50">이미지까지 게시하려면 첫 번째 버튼을 사용하세요. BAND 공식 Open API는 이미지 첨부를 지원하지 않아 자동 게시 버튼은 본문만 전송합니다.</p>
        {notice ? <p className="rounded border border-sea/20 bg-sea/5 px-3 py-2 text-xs font-bold text-sea" role="status">{notice}</p> : null}
      </div>

      {confirmOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
        <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="band-confirm-title">
          <button type="button" className="float-right grid size-9 place-items-center rounded border border-line" onClick={() => setConfirmOpen(false)} aria-label="닫기"><X size={17} /></button>
          <AlertTriangle className="text-brick" size={28} />
          <h3 id="band-confirm-title" className="mt-3 font-display text-xl font-black">본문만 BAND에 게시할까요?</h3>
          <p className="mt-2 text-sm leading-6 text-ink/60">이미지는 첨부되지 않습니다. 게시 대상은 <strong>{status?.targetName}</strong>으로 다시 확인됩니다.</p>
          <label className="journal-label mt-4">확인을 위해 밴드 이름 입력<input className="journal-input" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder={status?.targetName} /></label>
          <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded bg-ink font-black text-paper disabled:opacity-40" disabled={publishing || confirmText !== status?.targetName} onClick={publishTextOnly}>{publishing ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}{publishing ? "대상 재확인 후 게시 중" : "본문만 게시"}</button>
        </section>
      </div> : null}
    </section>
  );
}
