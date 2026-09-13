import { NextRequest, NextResponse } from "next/server";
import { accountingGoogleFileId, downloadGoogleAccountingWorkbook } from "@/lib/worship-journal-accounting-google";
import { MAX_ACCOUNTING_SIZE } from "@/lib/worship-journal-accounting";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get("url") || "";
    const id = accountingGoogleFileId(source);
    let buffer: Buffer | undefined;
    if (request.nextUrl.searchParams.get("kind") === "attendance") {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=xlsx`, {cache:"no-store",signal:AbortSignal.timeout(30000)});
      if (response.ok && !response.headers.get("content-type")?.includes("text/html")) {
        if (Number(response.headers.get("content-length")) > MAX_ACCOUNTING_SIZE) throw new Error("원문 파일은 15MB 이하만 볼 수 있습니다.");
        buffer = Buffer.from(await response.arrayBuffer());
      }
    }
    if (!buffer) buffer = (await downloadGoogleAccountingWorkbook(source)).buffer;
    if (!buffer.length || buffer.length > MAX_ACCOUNTING_SIZE) throw new Error("원문 파일 크기를 확인해 주세요. 최대 15MB입니다.");
    return new NextResponse(new Uint8Array(buffer), {headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Cache-Control":"private, no-store"}});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : "원문 이미지를 불러오지 못했습니다."}, {status:400,headers:{"Cache-Control":"no-store"}});
  }
}
