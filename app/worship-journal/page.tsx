import { AppShell } from "@/components/app-shell";
import { PageActions } from "@/components/page-actions";
import { WorshipJournalBuilder } from "@/components/worship-journal-builder";

export default function WorshipJournalPage() {
  return (
    <AppShell>
      <PageActions />
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sea">Weekly worship archive</p>
        <h1 className="mt-1 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">예배일지 자동 작성</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">출석 시트 링크, 주보 HWP, 회계 엑셀 또는 Google Sheet를 넣고 새가족만 적어주세요. 실행하면 가족별 출석, 감사헌금, 예배 정보와 광고를 한 장의 일지로 정리해 날짜별로 저장합니다.</p>
      </div>
      <WorshipJournalBuilder />
    </AppShell>
  );
}
