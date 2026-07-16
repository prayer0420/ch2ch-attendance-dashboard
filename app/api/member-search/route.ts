import { NextRequest, NextResponse } from "next/server";
import { getCh2chConnectionStatus, searchCh2chMembers } from "@/lib/ch2ch-member-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}

function isLocalRequest(request: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname);
}

function validateName(value: string) {
  return value.length >= 2 && value.length <= 30 && /^[가-힣A-Za-z\s]+$/.test(value);
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return json({ error: "교인 검색은 이 컴퓨터의 로컬 홈페이지에서만 사용할 수 있습니다." }, 403);
  }
  return json(getCh2chConnectionStatus());
}

export async function POST(request: NextRequest) {
  try {
    if (!isLocalRequest(request)) {
      return json({ error: "교인 검색은 이 컴퓨터의 로컬 홈페이지에서만 사용할 수 있습니다." }, 403);
    }
    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!validateName(name)) {
      return json({ error: "이름을 두 글자 이상 정확하게 입력해 주세요." }, 400);
    }
    const results = await searchCh2chMembers(name);
    return json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CH2CH 검색 중 오류가 발생했습니다.";
    return json({ error: message, connected: false }, 500);
  }
}
