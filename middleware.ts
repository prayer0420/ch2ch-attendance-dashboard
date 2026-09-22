import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validSession } from "@/lib/security";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/") || path === "/manifest.webmanifest" || path === "/sw.js" || /^\/icons\/app-(192|512|maskable-512)\.png$/.test(path)) return NextResponse.next();
  if (!(await validSession(request.cookies.get(SESSION_COOKIE)?.value))) {
    let base = new URL(request.url);
    const configured = process.env.APP_PUBLIC_ORIGIN?.trim();
    if (configured) {
      try {
        const external = new URL(configured);
        if (external.protocol !== "https:" || external.username || external.password ||
            external.pathname !== "/" || external.search || external.hash) throw new Error("Invalid public origin");
        // Pin the destination instead of trusting X-Forwarded-Host. Middleware
        // requires an absolute redirect, but Next may give us an internal URL.
        if (request.headers.get("host") === external.host) base = external;
      } catch {
        return new NextResponse("Invalid public origin configuration", { status: 503 });
      }
    }
    const login = new URL("/login", base);
    login.searchParams.set("next", path + request.nextUrl.search);
    const response = NextResponse.redirect(login);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
