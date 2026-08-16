export function buildAttendanceActions(rowInfo, { onlyPresent = false } = {}) {
  const actions = [
    { fieldName: '주일', desired: rowInfo.sunday === true, checkboxIndex: 0 },
    { fieldName: '부서', desired: rowInfo.department === true, checkboxIndex: 1 }
  ];
  return onlyPresent ? actions.filter((action) => action.desired) : actions;
}

export function attendanceTargetSatisfied(rowInfo, state) {
  if (!state?.ok) return false;
  if (rowInfo.sunday === true && state.sunday !== true) return false;
  if (rowInfo.department === true && state.department !== true) return false;
  return true;
}
