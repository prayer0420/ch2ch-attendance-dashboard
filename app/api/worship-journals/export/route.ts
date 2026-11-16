import { readJournals } from "@/lib/local-store/provider.cjs";
import { checkRequestSecurity } from "@/lib/security";
import type { WorshipJournal } from "@/lib/worship-journal";
import { exportWorshipJournalSheetPdf } from "@/lib/worship-journal-google-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 120) return Response.json({ error: "저장된 예배일지를 선택해 주세요." }, { status: 400 });
  try {
    const journals = readJournals() as WorshipJournal[];
    const journal = journals.find((item) => item.id === id);
    if (!journal?.outputSheet) return Response.json({ error: "먼저 Google Sheet에 최종 제출한 예배일지를 선택해 주세요." }, { status: 404 });
    const pdf = await exportWorshipJournalSheetPdf(journal.outputSheet);
    return new Response(Buffer.from(pdf), { headers: {
      "Content-Type": "application/pdf", "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="worship-journal-${journal.date.replace(/[^0-9-]/g, "")}.pdf"`
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "시트 원본을 내보내지 못했습니다." }, { status: 502 });
  }
}
