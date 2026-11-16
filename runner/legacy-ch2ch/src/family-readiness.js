// Only two entry attempts. No attendance or save operations are performed here.
export async function ensureFamilyReady({ enter, inspect, record, pause, timeoutMs = 8000, now = Date.now }) {
  const attempts = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const started = now();
    const entered = await enter(attempt);
    const deadline = now() + timeoutMs;
    let snapshot = null;
    let stable = '';
    let ready = false;
    // The click may time out after the server has already changed the view.
    // Inspect the actual table even after a navigation error; never replace
    // membership/week checks with the click's boolean return value.
    {
      do {
        snapshot = await inspect();
        const signature = JSON.stringify([snapshot.matchedNames, snapshot.observedFamilies, snapshot.selectedWeeks, snapshot.rows]);
        // Two equal observations avoid using a partially replaced table.
        if (snapshot.matched > 0 && !snapshot.weekMismatch && !snapshot.ambiguous && !snapshot.errors?.length) {
          if (signature === stable) { ready = true; break; }
          stable = signature;
        } else stable = '';
        if (now() >= deadline) break;
        await pause(200);
      } while (true);
    }
    const reason = ready ? (entered ? 'exact-members-stable' : 'view-confirmed-after-navigation-error') : !entered ? 'navigation-not-confirmed'
      : snapshot?.weekMismatch ? 'week-mismatch'
      : snapshot?.errors?.length ? 'frame-read-error'
      : snapshot?.ambiguous ? 'ambiguous-members'
      : !snapshot?.rows ? 'no-visible-attendance-rows'
      : !snapshot?.matched ? 'expected-members-not-found' : 'table-not-stable';
    const detail = { attempt, entered, ready, reason, elapsedMs: now() - started, snapshot };
    attempts.push(detail);
    await record(detail);
    if (ready) return { ok: true, attempts };
  }
  return { ok: false, attempts };
}
