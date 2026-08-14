export function buildAttendanceActions(rowInfo) {
  return [
    { fieldName: '주일', desired: rowInfo.sunday === true, checkboxIndex: 0 },
    { fieldName: '부서', desired: rowInfo.department === true, checkboxIndex: 1 }
  ];
}
