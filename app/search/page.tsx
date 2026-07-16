import { AppShell } from "@/components/app-shell";
import { MemberSearch } from "@/components/member-search";
import { SectionTitle } from "@/components/ui";

export default function SearchPage() {
  return (
    <AppShell>
      <SectionTitle eyebrow="교인관리" title="이름 검색" />
      <MemberSearch />
    </AppShell>
  );
}
