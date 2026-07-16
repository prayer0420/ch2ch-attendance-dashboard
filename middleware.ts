import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ch2ch_admin_session";

function authEnabled() {
  return process.env.APP_AUTH_ENABLED === "true" || process.env.VERCEL === "1";
}

function authConfigured() {
  return Boolean(process.env.APP_ACCESS_PASSWORD && process.env.APP_SESSION_TOKEN);
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff2?)$/i.test(pathname)
  );
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function middleware(request: NextRequest) {
  if (!authEnabled() || isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (!authConfigured()) {
    if (isApi) return jsonError("관리자 접속 비밀번호가 아직 설정되지 않았습니다.", 503);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("setup", "1");
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const expectedToken = process.env.APP_SESSION_TOKEN;
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
  if (sessionToken && expectedToken && sessionToken === expectedToken) {
    return NextResponse.next();
  }

  if (isApi) return jsonError("관리자 로그인이 필요합니다.", 401);

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
