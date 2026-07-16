import { AppShell } from "@/components/app-shell";
import { QrAttendanceSync } from "@/components/qr-attendance-sync";
import { SectionTitle } from "@/components/ui";

export default function QrAttendancePage() {
  return (
    <AppShell>
      <SectionTitle eyebrow="QR 출석 동기화" title="CH2CH QR 명단을 시트에 반영" />
      <QrAttendanceSync />
    </AppShell>
  );
}

