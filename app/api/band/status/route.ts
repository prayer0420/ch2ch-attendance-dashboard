import { NextResponse } from "next/server";
import { resolveTargetBand, TARGET_NAME } from "@/lib/band-api";

export const dynamic = "force-dynamic";

async function status(accessToken?: string) {
  try {
    const band = await resolveTargetBand({ accessToken });
    return NextResponse.json({
      ready: true,
      targetName: band.name,
      memberCount: band.member_count,
      message: `대상 확인 완료 · 멤버 ${band.member_count}명`,
    });
  } catch (error) {
    return NextResponse.json({
      ready: false,
      targetName: TARGET_NAME,
      message: error instanceof Error ? error.message : "BAND 연결을 확인할 수 없습니다.",
    });
  }
}

export async function GET() {
  return status();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return status(typeof body?.accessToken === "string" ? body.accessToken : undefined);
}
