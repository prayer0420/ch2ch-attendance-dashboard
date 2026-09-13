export const DEFAULT_ATTENDANCE_SHEET_URL = "https://docs.google.com/spreadsheets/d/11TQJbhev8m0MfPqW70b2HPbuXleOOfMSL2MXpr3Ab2o/edit?pli=1&gid=437108819#gid=437108819";
export const ATTENDANCE_SHEET_STORAGE_KEY = "ch2ch-attendance-sheet-url-v1";

export function isAttendanceSheetUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "docs.google.com" && /^\/spreadsheets\/d\/(?:e\/)?[^/]+/.test(url.pathname);
  } catch {
    return false;
  }
}

export function readAttendanceSheetUrl(storage?: Pick<Storage, "getItem">) {
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  try {
    const saved = target?.getItem(ATTENDANCE_SHEET_STORAGE_KEY)?.trim() ?? "";
    return isAttendanceSheetUrl(saved) ? saved : DEFAULT_ATTENDANCE_SHEET_URL;
  } catch {
    return DEFAULT_ATTENDANCE_SHEET_URL;
  }
}

export function saveAttendanceSheetUrl(url: string, storage?: Pick<Storage, "setItem">) {
  const value = url.trim();
  if (!isAttendanceSheetUrl(value)) return;
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  try {
    target?.setItem(ATTENDANCE_SHEET_STORAGE_KEY, value);
  } catch {}
}
