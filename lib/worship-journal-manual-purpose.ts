import type { JournalAccounting, PurposeOffering } from "./worship-journal-accounting";

export function addManualPurposeOfferings(accounting: JournalAccounting, raw: unknown): JournalAccounting {
  if (!Array.isArray(raw) || raw.length > 10) throw new Error("목적헌금 수기 입력은 최대 10건까지 가능합니다.");
  const manual: PurposeOffering[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") throw new Error("목적헌금 입력 형식을 확인해 주세요.");
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const amountText = typeof item.amount === "string" ? item.amount.trim() : item.amount;
    if (!name && (amountText === "" || amountText == null)) continue;
    const amount = typeof amountText === "string" && /^\d+$/.test(amountText) ? Number(amountText) : amountText;
    if (!name || name.length > 100 || typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000) {
      throw new Error("목적헌금 항목명과 1원 이상의 정수 금액을 입력해 주세요.");
    }
    manual.push({ name, amount, note: "" });
  }
  const purpose = [...accounting.purpose, ...manual];
  if (purpose.length > 10) throw new Error("회계 원본과 수기 입력을 합친 목적헌금은 최대 10건까지 가능합니다.");
  return {
    ...accounting, purpose,
    purposeTotal: accounting.purposeTotal + manual.reduce((sum, item) => sum + item.amount, 0),
    total: accounting.sundayTotal + accounting.thanksgivingTotal
  };
}
