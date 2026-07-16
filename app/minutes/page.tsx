"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  MinusCircle,
  PlusCircle,
  Send,
  X,
} from "lucide-react";
import "./minutes.css";

const TARGET_NAME = "2026 임원밴드";
const BAND_MY_APPS_URL = "https://developers.band.us/develop/myapps/list";
const TODAY_TAG = "#20260703";
const TODAY_LABEL = "2026년 7월 3일 금요일";
const HEADER_LINE = `#회의록 #서기팀 ${TODAY_TAG} #금요일`;

type BandStatus = {
  ready: boolean;
  targetName: string;
  message: string;
  memberCount?: number;
};

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
};

function makeAgendaTemplate() {
  return Array.from({ length: 8 }, (_, index) => {
    const number = index + 1;
    return `${number}.
${number})
-
*`;
  }).join("\n\n");
}

const AGENDA_TEMPLATE = makeAgendaTemplate();
const DEFAULT_CONTENT = `${HEADER_LINE}

${AGENDA_TEMPLATE}`;

function lineKind(line: string) {
  if (/^#/.test(line)) return "tag";
  if (/^\s*(\d+\.|\d+\)|[가-힣]\)|[-*])\s*/.test(line)) return "list";
  return "plain";
}

function removeHeaderLine(value: string) {
  return value
    .split("\n")
    .filter((line) => line.trim() !== HEADER_LINE)
    .join("\n")
    .replace(/^\n+/, "");
}

function removeAgendaTemplate(value: string) {
  return value.replace(AGENDA_TEMPLATE, "").replace(/\n{3,}/g, "\n\n").trimStart();
}

export default function MinutesPage() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [status, setStatus] = useState<BandStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ open: false, x: 0, y: 0 });
  const [tokenGuideOpen, setTokenGuideOpen] = useState(false);

  useEffect(() => {
    fetch("/api/band/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: BandStatus) => {
        if (data.ready) {
          setStatus(data);
          return;
        }

        setStatus({
          ready: false,
          targetName: TARGET_NAME,
          message: "BAND 공식 심사와 계정 인증이 완료되기 전까지 자동 게시는 잠겨 있습니다.",
        });
      })
      .catch(() =>
        setStatus({
          ready: false,
          targetName: TARGET_NAME,
          message: "BAND 공식 심사와 계정 인증이 완료되기 전까지 자동 게시는 잠겨 있습니다.",
        }),
      );
  }, []);

  useEffect(() => {
    function closeMenu() {
      setContextMenu((menu) => ({ ...menu, open: false }));
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const lines = useMemo(() => content.split("\n"), [content]);
  const hasHeader = content.split("\n").some((line) => line.trim() === HEADER_LINE);
  const hasAgendaTemplate = content.includes(AGENDA_TEMPLATE);
  const canPublish =
    Boolean(content.trim().length) &&
    Boolean(status?.ready) &&
    confirmText === TARGET_NAME &&
    !submitting;

  function addHeaderLine() {
    setContent((value) => {
      if (value.split("\n").some((line) => line.trim() === HEADER_LINE)) return value;
      return value.trim() ? `${HEADER_LINE}\n\n${value}` : HEADER_LINE;
    });
  }

  function deleteHeaderLine() {
    setContent((value) => removeHeaderLine(value));
  }

  function addAgendaTemplate() {
    setContent((value) => {
      if (value.includes(AGENDA_TEMPLATE)) return value;
      return value.trim() ? `${value.trimEnd()}\n\n${AGENDA_TEMPLATE}` : AGENDA_TEMPLATE;
    });
  }

  function deleteAgendaTemplate() {
    setContent((value) => removeAgendaTemplate(value));
  }

  function openContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    setContextMenu({ open: true, x: event.clientX, y: event.clientY });
  }

  function runMenuAction(action: () => void) {
    action();
    setContextMenu((menu) => ({ ...menu, open: false }));
  }

  async function copyContent() {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setNotice("회의록 원문을 복사했습니다. 2026 임원밴드에 직접 붙여넣어 주세요.");
    } catch {
      setNotice("복사에 실패했습니다. 원문 칸에서 직접 선택해 복사해 주세요.");
    }
  }

  async function publish() {
    if (!canPublish) return;
    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/band/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          targetName: TARGET_NAME,
          confirmed: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "게시하지 못했습니다.");

      setConfirmOpen(false);
      setConfirmText("");
      setNotice(`게시 완료 · ${TARGET_NAME} · 게시물 ${data.postKey}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "게시하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="minutes-app">
      <header className="minutes-header">
        <div>
          <p className="kicker">EXECUTIVE NOTES · 2026</p>
          <h1>회의록 작성실</h1>
        </div>
        <div className={`target-pill ${status?.ready ? "is-ready" : ""}`}>
          <span className="target-dot" />
          <div>
            <small>게시 대상</small>
            <strong>{TARGET_NAME}</strong>
          </div>
          {status?.ready ? <Check size={19} /> : <AlertTriangle size={19} />}
        </div>
      </header>

      {!status?.ready && (
        <>
          <section className="official-gate" aria-label="BAND 공식 심사 안내">
            <div>
              <p className="kicker">BAND OFFICIAL REVIEW</p>
              <h2>BAND 공식 홈페이지에서 발급 신청이 필요합니다</h2>
              <p>
                자동 게시용 access token은 BAND Developers에서 서비스 등록 후 발급까지 BAND 공식 심사와 BAND 계정 인증을 거쳐야 받을 수 있습니다.
                승인 전에는 아래 원문 복사 기능으로 수동 게시해 주세요.
              </p>
            </div>
            <a className="token-link-primary" href={BAND_MY_APPS_URL} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              BAND 공식 홈페이지 열기
            </a>
          </section>

          <section className={`token-guide-panel ${tokenGuideOpen ? "is-open" : ""}`} aria-label="BAND access token 발급 도움말">
            <button
              type="button"
              className="token-guide-toggle"
              onClick={() => setTokenGuideOpen((open) => !open)}
              aria-expanded={tokenGuideOpen}
            >
              <span>
                <b>발급 전 체크할 내용</b>
                <small>추천 입력값과 심사/인증 안내를 접어서 볼 수 있어요</small>
              </span>
              <ChevronDown size={20} />
            </button>

            {tokenGuideOpen && (
              <div className="token-guide-content">
                <div className="copy-grid" aria-label="BAND Developers 추천 입력값">
                  <label>
                    서비스 이름(영문)
                    <code>minutes-uploader</code>
                  </label>
                  <label>
                    서비스 이름(한글)
                    <code>회의록 업로더</code>
                  </label>
                  <label>
                    Redirect URI
                    <code>http://localhost:3000/minutes</code>
                  </label>
                  <label>
                    이용 목적
                    <code>회의록을 작성한 뒤 2026 임원밴드에 게시하기 위해 사용</code>
                  </label>
                </div>

                <ol className="guide-steps">
                  <li>필수칸만 채우고 서비스를 등록합니다.</li>
                  <li>자동 게시 권한 발급까지 BAND 공식 심사가 필요할 수 있습니다.</li>
                  <li>심사 후 My Apps에서 등록한 서비스를 다시 엽니다.</li>
                  <li>Connect BAND account 버튼으로 BAND 계정 인증을 진행합니다.</li>
                  <li>발급된 access token을 복사해 서버 설정에 넣으면 자동 게시를 켤 수 있습니다.</li>
                </ol>
              </div>
            )}
          </section>
        </>
      )}

      <section className="band-strip">
        <div>
          <strong>BAND 게시 상태</strong>
          <span>{status?.message ?? "BAND 연결 확인 중입니다."}</span>
        </div>
        <p>자동 게시는 오직 “2026 임원밴드” 대상 검증을 통과했을 때만 열립니다.</p>
      </section>

      <div className="workspace-grid">
        <section className="editor-panel" onContextMenu={openContextMenu}>
          <div className="panel-heading">
            <div>
              <span>01</span>
              <h2>회의록 원문</h2>
            </div>
            <em>{content.length.toLocaleString()}자</em>
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={`${HEADER_LINE}\n\n1.\n1)\n-\n*`}
            spellCheck={false}
            aria-label="회의록 원문"
          />
          <div className="editor-foot">
            <ClipboardList size={17} />
            우클릭하면 #자동/템플릿 메뉴가 열립니다. 입력한 글자와 줄바꿈 그대로 사용합니다.
          </div>
        </section>

        <section className="preview-panel">
          <div className="panel-heading light">
            <div>
              <span>02</span>
              <h2>BAND 미리보기</h2>
            </div>
            <em>표시만 정돈</em>
          </div>
          <article className="band-preview">
            <div className="preview-author">
              <div className="avatar">26</div>
              <div>
                <strong>{TARGET_NAME}</strong>
                <small>게시 전 미리보기</small>
              </div>
            </div>
            <div className="preview-content">
              {content ? (
                lines.map((line, index) => (
                  <div className={lineKind(line)} key={index}>
                    {line || "\u00a0"}
                  </div>
                ))
              ) : (
                <p className="empty-copy">왼쪽에 입력한 원문이 이곳에 보입니다.</p>
              )}
            </div>
          </article>
        </section>
      </div>

      {contextMenu.open && (
        <div
          className="editor-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => runMenuAction(hasHeader ? deleteHeaderLine : addHeaderLine)}>
            {hasHeader ? <MinusCircle size={14} /> : <PlusCircle size={14} />}
            #자동 {hasHeader ? "삭제" : "추가"}
          </button>
          <button type="button" onClick={() => runMenuAction(hasAgendaTemplate ? deleteAgendaTemplate : addAgendaTemplate)}>
            {hasAgendaTemplate ? <MinusCircle size={14} /> : <PlusCircle size={14} />}
            템플릿 {hasAgendaTemplate ? "삭제" : "추가"}
          </button>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      <footer className="publish-dock">
        <div>
          <small>FINAL DESTINATION</small>
          <strong>{TARGET_NAME}</strong>
        </div>
        <div className="dock-actions">
          <button type="button" className="copy-button" disabled={!content.trim()} onClick={copyContent}>
            원문 복사
          </button>
          <button disabled={!content.trim() || !status?.ready} onClick={() => setConfirmOpen(true)}>
            <Send size={20} />
            게시 확인
          </button>
        </div>
      </footer>

      {confirmOpen && (
        <div className="modal-backdrop">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <button className="close-button" onClick={() => setConfirmOpen(false)} aria-label="닫기">
              <X />
            </button>
            <div className="warning-mark">
              <AlertTriangle />
            </div>
            <p className="kicker">LAST SAFETY CHECK</p>
            <h2 id="confirm-title">정말 이 밴드에 게시할까요?</h2>
            <div className="destination-card">
              <span>게시 대상</span>
              <strong>{TARGET_NAME}</strong>
              <small>다른 밴드는 선택할 수도, 전송할 수도 없습니다.</small>
            </div>
            <label>
              확인을 위해 <b>{TARGET_NAME}</b>를 입력하세요.
              <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} autoFocus />
            </label>
            <button className="final-button" disabled={!canPublish} onClick={publish}>
              {submitting ? "대상 재확인 후 게시 중" : "그대로 게시"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
