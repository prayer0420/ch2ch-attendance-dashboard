"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Panel } from "@/components/ui";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type InstallContextValue = { ready: boolean; installed: boolean; busy: boolean; message: string; install(): Promise<void> };
const InstallContext = createContext<InstallContextValue | null>(null);

export function AppInstallProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (/Electron\//.test(navigator.userAgent)) { setInstalled(true); return; }
    const standalone = matchMedia("(display-mode: standalone)");
    const updateDisplay = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    updateDisplay();
    standalone.addEventListener("change", updateDisplay);
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const afterInstall = () => { setInstalled(true); setPrompt(null); setMessage("앱을 설치했습니다. 홈 화면에서 CH2CH를 열 수 있습니다."); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", afterInstall);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => setMessage("오프라인 안내를 준비하지 못했습니다. 온라인 웹 사용은 가능합니다."));
    } else if (!window.isSecureContext) {
      setMessage("휴대폰 앱 설치에는 HTTPS 서버 주소가 필요합니다.");
    }
    return () => {
      standalone.removeEventListener("change", updateDisplay);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", afterInstall);
    };
  }, []);

  async function install() {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "설치를 요청했습니다. 홈 화면 또는 앱 목록에서 확인해 주세요." : "설치를 취소했습니다. 웹에서도 계속 사용할 수 있습니다.");
    } catch { setMessage("설치 창을 열지 못했습니다. 브라우저 메뉴의 앱 설치 또는 홈 화면 추가를 사용해 주세요."); }
    finally { setPrompt(null); setBusy(false); }
  }
  return <InstallContext.Provider value={{ ready: Boolean(prompt), installed, busy, message, install }}>{children}</InstallContext.Provider>;
}

export function AppInstallCard() {
  const state = useContext(InstallContext);
  if (!state) return null;
  return <Panel>
    <h2 className="flex items-center gap-2 text-lg font-black"><Smartphone size={18} aria-hidden="true" />홈 화면에 앱 추가</h2>
    <p className="mt-2 text-sm leading-6 text-ink/65">휴대폰과 PC에서 브라우저 주소창 없이 앱처럼 열 수 있습니다. 인터넷 연결과 로그인이 필요합니다.</p>
    {state.installed ? <p className="mt-4 text-sm font-bold text-sea">현재 앱 모드로 사용 중이거나 설치를 완료했습니다.</p> : state.ready ? <button onClick={state.install} disabled={state.busy} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded bg-sea px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Download size={16} aria-hidden="true" />{state.busy ? "설치 요청 중…" : "CH2CH 앱 설치"}</button> : <div className="mt-4 space-y-2 rounded border border-line bg-paper/50 p-3 text-sm leading-6"><p><strong>iPhone·iPad:</strong> Safari의 공유 → 홈 화면에 추가</p><p><strong>Android·PC:</strong> Chrome 또는 Edge 메뉴 → 앱 설치 / 홈 화면에 추가</p><p className="text-xs text-ink/60">표시되는 메뉴는 기기·브라우저에 따라 다릅니다. 이미 설치한 경우 앱 목록을 확인하세요.</p></div>}
    <p role="status" className="mt-3 text-sm leading-6 text-sea">{state.message}</p>
    <p className="mt-4 text-xs leading-5 text-ink/60">모바일 웹앱은 출석 실행기를 대체하지 않습니다. 출석·회계자료를 오프라인 저장하지 않으며, 연결이 끊긴 요청도 자동 재전송하지 않습니다.</p>
  </Panel>;
}
