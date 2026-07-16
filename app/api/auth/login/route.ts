import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ch2ch_admin_session";

function wantsJson(request: NextRequest) {
  return request.headers.get("accept")?.includes("application/json") || request.headers.get("content-type")?.includes("application/json");
}

function cleanNextPath(value: unknown) {
  const nextPath = String(value || "/").trim();
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/";
  if (nextPath.startsWith("/api/")) return "/";
  return nextPath;
}

function redirectToLogin(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const jsonMode = wantsJson(request);
  let password = "";
  let nextPath = "/";

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    password = String(body?.password || "");
    nextPath = cleanNextPath(body?.next);
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "");
    nextPath = cleanNextPath(form.get("next"));
  }

  const accessPassword = process.env.APP_ACCESS_PASSWORD;
  const sessionToken = process.env.APP_SESSION_TOKEN;
  if (!accessPassword || !sessionToken) {
    if (jsonMode) return NextResponse.json({ error: "APP_ACCESS_PASSWORD와 APP_SESSION_TOKEN을 먼저 설정해 주세요." }, { status: 503 });
    return redirectToLogin(request, { setup: "1", next: nextPath });
  }

  if (password !== accessPassword) {
    if (jsonMode) return NextResponse.json({ error: "접속 코드가 맞지 않습니다." }, { status: 401 });
    return redirectToLogin(request, { error: "1", next: nextPath });
  }

  const response = jsonMode ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Number(process.env.APP_SESSION_MAX_AGE_SECONDS || 60 * 60 * 12)
  });
  return response;
}
