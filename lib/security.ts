export const SESSION_COOKIE = "ch2ch_admin_session";
const encoder = new TextEncoder();

export function securityConfigured() {
  return (process.env.APP_ACCESS_PASSWORD?.length ?? 0) >= 12 && (process.env.APP_SESSION_TOKEN?.length ?? 0) >= 32;
}

export function sessionLifetime() {
  const value = Number(process.env.APP_SESSION_MAX_AGE_SECONDS || 43200);
  return Number.isFinite(value) ? Math.min(43200, Math.max(300, value)) : 43200;
}

async function signingKey() {
  if (!securityConfigured()) throw new Error("관리자 인증 설정이 필요합니다.");
  return crypto.subtle.importKey("raw", encoder.encode(process.env.APP_SESSION_TOKEN!), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSession(now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + sessionLifetime()}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function validSession(token: string | undefined, now = Date.now()) {
  if (!securityConfigured() || !token || token.length > 256) return false;
  const [expiry, nonce, signature, extra] = token.split(".");
  if (extra || !/^\d+$/.test(expiry) || !/^[a-f0-9-]{36}$/.test(nonce || "") || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const seconds = Math.floor(now / 1000);
  if (Number(expiry) <= seconds || Number(expiry) > seconds + sessionLifetime()) return false;
  return crypto.subtle.verify("HMAC", await signingKey(), Uint8Array.from(signature.match(/../g)!, byte => parseInt(byte, 16)), encoder.encode(`${expiry}.${nonce}`));
}

export function sessionFromRequest(request: Request) {
  return request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

export function safeNextPath(value: unknown) {
  const path = String(value || "/").trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f]/.test(path) || /%5c|%0[ad]/i.test(path) || path.startsWith("/api/")) return "/";
  return path;
}

export function sameOriginMutation(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const source = new URL(origin);
    const destination = new URL(request.url);
    const host = request.headers.get("host") || destination.host;
    const configured = process.env.APP_PUBLIC_ORIGIN?.trim();
    if (configured) {
      const external = new URL(configured);
      // A pinned HTTPS origin is required for a TLS-terminating reverse proxy.
      // Never derive the trusted origin from attacker-controlled forwarding headers.
      if (external.protocol !== "https:" || external.username || external.password ||
          external.pathname !== "/" || external.search || external.hash) return false;
      if (host === external.host) {
        return source.origin === external.origin &&
          (destination.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https");
      }
    }
    // Next's internal URL may use localhost while the browser uses 127.0.0.1.
    // Host is browser-controlled; do not trust arbitrary X-Forwarded-Host values.
    return source.protocol === destination.protocol && source.host === host;
  } catch { return false; }
}

export function securityError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function limitedText(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { void reader.cancel(); throw new Error("요청 데이터가 너무 큽니다."); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function checkRequestSecurity(request: Request, worker = false) {
  if (worker) {
    const expected = process.env.QR_WORKER_TOKEN;
    if (!expected || expected.length < 32 || request.headers.get("x-qr-worker-token") !== expected) return securityError("QR Worker 인증 실패", 401);
  } else {
    if (!securityConfigured()) return securityError("관리자 인증 환경변수를 설정해 주세요.", 503);
    if (!(await validSession(sessionFromRequest(request)))) return securityError("로그인이 필요합니다.", 401);
    if (!sameOriginMutation(request)) return securityError("허용되지 않은 요청 출처입니다.", 403);
  }
  // Count bytes even when Content-Length is absent or forged.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const limit = request.headers.get("content-type")?.startsWith("multipart/form-data") ? 48 * 1024 * 1024 : 4 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > limit) return securityError("요청 데이터가 너무 큽니다.", 413);
    const reader = request.clone().body?.getReader();
    if (reader) {
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) { void reader.cancel(); return securityError("요청 데이터가 너무 큽니다.", 413); }
        }
      } finally { reader.releaseLock(); }
    }
  }
  return null;
}
