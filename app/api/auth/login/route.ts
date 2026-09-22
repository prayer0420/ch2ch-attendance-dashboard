import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSession, safeNextPath, sameOriginMutation, securityConfigured, securityError, sessionLifetime, limitedText } from "@/lib/security";

const attempts = { count: 0, expires: 0 };

const COOKIE_NAME = "ch2ch_admin_session";

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
  if (Date.now() >= attempts.expires) { attempts.count = 0; attempts.expires = Date.now() + 600000; }
  if (++attempts.count > 30) return securityError("로그인 요청이 많습니다. 10분 후 다시 시도해 주세요.", 429);
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

  const received = Buffer.from(password);
  const expected = Buffer.from(accessPassword);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    if (jsonMode) return NextResponse.json({ error: "접속 코드가 맞지 않습니다." }, { status: 401 });
    return redirectToLogin(request, { error: "1", next: nextPath });
  }

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
