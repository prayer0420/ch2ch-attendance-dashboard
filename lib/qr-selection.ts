export type QrSelection = { week: number; sheetUrl: string; sheetTab: string };

export function readQrSelection(value: unknown): QrSelection {
  const input = value as Partial<QrSelection> | null;
  const week = Number(input?.week);
  const sheetUrl = String(input?.sheetUrl ?? "").trim();
  const sheetTab = String(input?.sheetTab ?? "").trim();
  if (!Number.isInteger(week) || week < 1 || week > 53 || !sheetUrl || !sheetTab) {
    throw new Error("QR 주차·시트 주소·탭 이름을 모두 설정한 뒤 명단을 다시 불러와 주세요.");
  }
  return { week, sheetUrl, sheetTab };
}

export function qrSelectionMatches(left: unknown, right: unknown): boolean {
  try {
    const a = readQrSelection(left);
    const b = readQrSelection(right);
    return a.week === b.week && a.sheetUrl === b.sheetUrl && a.sheetTab === b.sheetTab;
  } catch { return false; }
}

export function assertQrSelectionMatches(preview: unknown, selection: unknown) {
  if (!qrSelectionMatches(preview, selection)) {
    throw new Error("현재 설정과 QR 미리보기의 주차·시트·탭이 다릅니다. 현재 설정으로 명단을 다시 불러와 주세요.");
  }
}

export function exactQrTabPattern(title: string) {
  return new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

export function assertQrSourceWeek(week: number, selectedValue: string, label: string | null) {
  if (!Number.isInteger(week) || week < 1 || week > 53 ||
      !selectedValue.trim() || Number(selectedValue) !== week || !label?.trim()) {
    throw new Error(`CH2CH에서 요청한 ${week}주 선택을 확인하지 못했습니다. 다른 주차 명단은 읽지 않습니다.`);
  }
  return label.trim();
}
