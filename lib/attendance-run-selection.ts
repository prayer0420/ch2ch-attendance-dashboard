export type AttendanceRunPerson = {
  family: string;
  name: string;
  service13: boolean;
  service4: boolean;
  note?: string;
};

export type AttendanceRunMode = "sheet" | "check" | "clear";

export type AttendanceRunFamilyModes = Record<string, {
  sunday: AttendanceRunMode;
  department: AttendanceRunMode;
}>;

export function applyAttendanceMode(original: boolean, mode: AttendanceRunMode) {
  if (mode === "check") return true;
  if (mode === "clear") return false;
  return original;
}

/**
 * Build the complete synchronization payload from the source sheet.
 * Rows with both services unchecked are intentionally retained so the runner
 * can clear stale checks that remain in CH2CH.
 */
export function buildAttendanceRunRows(
  sourcePeople: AttendanceRunPerson[],
  familyModes: AttendanceRunFamilyModes
) {
  return sourcePeople.map((person) => {
    const modes = familyModes[person.family] ?? { sunday: "sheet", department: "sheet" };
    return {
      family: person.family,
      name: person.name,
      service13: applyAttendanceMode(person.service13, modes.sunday),
      service4: applyAttendanceMode(person.service4, modes.department),
      note: person.note ?? ""
    };
  });
}
