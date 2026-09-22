import { checkRequestSecurity } from "@/lib/security";
import { NextResponse } from "next/server";
import { checkTargetBandPosting, TARGET_NAME } from "@/lib/band-api";

export const dynamic = "force-dynamic";

async function status(accessToken?: string) {
  try {
    const { band, canPost } = await checkTargetBandPosting({ accessToken });
    return NextResponse.json({
      ready: canPost,
      targetName: band.name,
      memberCount: band.member_count,
      bandKey: band.band_key,
      bandUrl: `https://band.us/band/${encodeURIComponent(band.band_key)}`,
      message: canPost
        ? `대상과 글쓰기 권한 확인 완료 · 멤버 ${band.member_count}명`
        : `"${band.name}"에는 연결됐지만 이 계정에 글쓰기 권한이 없습니다.`,
    });
  } catch (error) {
    return NextResponse.json({
      ready: false,
      targetName: TARGET_NAME,
      message: error instanceof Error ? error.message : "BAND 연결을 확인할 수 없습니다.",
    });
  }
}

export async function GET(request: Request) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  return status();
}

export async function POST(request: Request) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  return status(typeof body?.accessToken === "string" ? body.accessToken : undefined);
}
