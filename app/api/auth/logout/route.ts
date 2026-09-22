import { NextRequest, NextResponse } from "next/server";
import { sameOriginMutation, securityError } from "@/lib/security";

const COOKIE_NAME = "ch2ch_admin_session";

export function POST(request: NextRequest) {
  if (!sameOriginMutation(request)) return securityError("허용되지 않은 요청 출처입니다.", 403);
  const response = new NextResponse(null, { status: 303, headers: { Location: "/login?logout=1" } });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
