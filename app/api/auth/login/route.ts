import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createSession, safeNextPath, sameOriginMutation, securityConfigured, securityError, sessionLifetime, limitedText } from "@/lib/security";
import { loginClient, loginRetryAfterMs, recordLoginFailure, recordLoginSuccess } from "@/lib/login-throttle";

const COOKIE_NAME = "ch2ch_admin_session";

function sameSecret(received: string, expected: string) {
  // Compare fixed-length digests so neither content nor length leaks through timing.
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(received), digest(expected));
}

function wantsJson(request: NextRequest) {
  return request.headers.get("accept")?.includes("application/json") || request.headers.get("content-type")?.includes("application/json");
}

function cleanNextPath(value: unknown) {
  return safeNextPath(value);
}

function redirectToLogin(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new NextResponse(null, { status: 303, headers: { Location: url.pathname + url.search } });
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return securityError("허용되지 않은 요청 출처입니다.", 403);
  const client = loginClient(request.headers);
  let raw: string;
  try { raw = await limitedText(request, 4096); }
  catch { return securityError("로그인 요청이 너무 큽니다.", 413); }
  const jsonMode = wantsJson(request);
  let password = "";
  let nextPath = "/";

  if (request.headers.get("content-type")?.includes("application/json")) {
    let body;
    try { body = JSON.parse(raw); } catch { return securityError("잘못된 요청입니다.", 400); }
    password = String(body?.password || "");
    nextPath = cleanNextPath(body?.next);
  } else {
    const form = new URLSearchParams(raw);
    password = String(form.get("password") || "");
    nextPath = cleanNextPath(form.get("next"));
  }

  const accessPassword = process.env.APP_ACCESS_PASSWORD;
  const sessionToken = process.env.APP_SESSION_TOKEN;
  if (!securityConfigured() || !accessPassword || !sessionToken) {
    if (jsonMode) return NextResponse.json({ error: "APP_ACCESS_PASSWORD와 APP_SESSION_TOKEN을 먼저 설정해 주세요." }, { status: 503 });
    return redirectToLogin(request, { setup: "1", next: nextPath });
  }

  // Lock check, comparison and failure recording run without an await between
  // them, so parallel requests cannot slip past the limit.
  const retryAfterMs = loginRetryAfterMs(client);
  if (retryAfterMs > 0) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
    if (jsonMode) {
      return NextResponse.json({ error: `로그인 시도가 많아 ${minutes}분 뒤에 다시 시도해 주세요.` }, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)), "Cache-Control": "no-store" }
      });
    }
    return redirectToLogin(request, { locked: String(minutes), next: nextPath });
  }
  if (!sameSecret(password, accessPassword)) {
    recordLoginFailure(client);
    if (jsonMode) return NextResponse.json({ error: "접속 코드가 맞지 않습니다." }, { status: 401 });
    return redirectToLogin(request, { error: "1", next: nextPath });
  }
  recordLoginSuccess(client);

  const response = jsonMode ? NextResponse.json({ ok: true }) : new NextResponse(null, { status: 303, headers: { Location: nextPath } });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(COOKIE_NAME, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetime()
  });
  return response;
}
