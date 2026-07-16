import { NextResponse } from "next/server";
import { publishToTargetBand, TARGET_NAME } from "@/lib/band-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.confirmed !== true || body?.targetName !== TARGET_NAME) {
      return NextResponse.json({ message: "게시 대상 확인값이 일치하지 않아 중단했습니다." }, { status: 400 });
    }

    if (typeof body.content !== "string" || !body.content.length) {
      return NextResponse.json({ message: "회의록 원문을 입력해 주세요." }, { status: 400 });
    }

    const result = await publishToTargetBand(body.content, {
      accessToken: typeof body.accessToken === "string" ? body.accessToken : undefined,
    });

    return NextResponse.json({ ok: true, postKey: result.post_key, bandKey: result.band_key });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "BAND 게시에 실패했습니다." },
      { status: 500 },
    );
  }
}
