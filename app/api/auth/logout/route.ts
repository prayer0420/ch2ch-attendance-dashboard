import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ch2ch_admin_session";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?logout=1", request.url));
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
