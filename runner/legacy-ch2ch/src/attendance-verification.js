export async function verifyPreparedRowsWithFreshRows(preparedRows, { findRow, readState, matches, mismatchReason }) {
  const mismatches = [];

  for (const item of preparedRows || []) {
    const freshRow = await findRow(item.rowInfo.name);
    const state = freshRow
      ? await readState(freshRow)
      : { ok: false, reason: `저장 후 '${item.rowInfo.name}' 행을 다시 찾지 못했습니다.` };

    if (!matches(item.rowInfo, state)) {
      mismatches.push({
        name: item.rowInfo.name,
        reason: state.ok ? mismatchReason(item.rowInfo, state) : state.reason
      });
    }
  }

  return {
    ok: mismatches.length === 0,
    checked: (preparedRows || []).length,
    mismatches
  };
}
