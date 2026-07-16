import { NextRequest, NextResponse } from "next/server";
import { captureCh2chMemberEvidence, type MemberSearchResult } from "@/lib/ch2ch-member-search";

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

export async function POST(request: NextRequest) {
  try {
    if (!isLocalRequest(request)) {
      return json({ error: "교인 검색은 이 컴퓨터의 로컬 홈페이지에서만 사용할 수 있습니다." }, 403);
    }
    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || "").trim();
    const memberId = String(body?.memberId || "").trim();
    const member = body?.member as MemberSearchResult | undefined;
    if (query.length < 2 || !memberId) {
      return json({ error: "스크린샷을 만들 검색 결과를 먼저 선택해 주세요." }, 400);
    }
    const proof = await captureCh2chMemberEvidence(query, memberId, member);
    return json(proof);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CH2CH 화면 확인 중 오류가 발생했습니다.";
    return json({ error: message, connected: false }, 500);
  }
}
