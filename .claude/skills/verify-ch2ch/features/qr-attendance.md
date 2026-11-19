# QR attendance

`QR 출석체크` reads the CH2CH entry log for one week, keeps 2청년회 entries, splits them into services 1·2·3부 and 4부, and checks attendance in the Google Sheet tab. On this PC (`localhost`) the server runs it directly. From a phone, through the public HTTPS origin, the server queues a job, the Runner runs it, and the page polls the job every 2s until it shows the preview. `Google Sheet에 반영` then queues an apply job the same way.

## Sub-features

- `qr.page`: `/qr-attendance` renders the week, Google Sheet URL and 시트 탭 inputs, `반영 규칙`, and `실제 반영`.
- `qr.queue-preview`: from the phone path, `QR 명단 불러오기` makes `/api/qr-attendance` return 202 and insert a `qr_sync_jobs` row with `action=preview`, `status=queued` and the chosen week, URL and tab. The button shows `명단 읽는 중`.
- `qr.poll-render`: when the job turns `completed` with a preview result, the page shows `2청년회 QR 출석 대상`, the counts, the `시트 미일치 N명` badge and the name lists.
- `qr.queue-apply`: `Google Sheet에 반영` inserts a job with `action=apply`, `status=queued`, carrying the shown preview. The button shows `시트 반영·재검사 중`.
- `qr.direct`: the local direct run, where the server itself drives CH2CH and Google. Not driven: it needs real CH2CH credentials and Google access, which are blanked here.
- `qr.runner`: the Runner executing the job. Not driven, because no Runner is attached.

## How to get to it (user POV)

- Sidebar `QR 출석체크`, on this PC or from a phone through the HTTPS tunnel.

## Driving it with verify.cjs

Preconditions: baseline state. The journey picks a unique fixture sheet URL, `https://docs.google.com/spreadsheets/d/verify-fixture-<hex>/edit`, which is never fetched because no Runner is attached.

- Run `journey qr-mobile-queue`. Chromium resolves `qr-mobile.verify.test` to 127.0.0.1 (`--host-resolver-rules`), so the server sees a non-localhost Host and takes the phone/queue path.
- Session: the journey logs in through the real `/api/auth/login` and puts that session cookie on the phone host. Production marks the cookie `Secure`, which a browser drops on plain http for a non-localhost name. UI login itself is covered by `journey login`.
- Steps:
  - fill `Google Sheet URL` and `시트 탭`, click `QR 명단 불러오기`;
  - check the queued preview row in the throwaway DB;
  - stand in for the Runner at its real boundary, the job row, by setting `status=completed` with a fixture preview: 3 downloaded, 2 in 2청년회, `가상검증A` in 1·2·3부, `가상검증B` in 4부 and unmatched;
  - wait for the rendered preview;
  - click `Google Sheet에 반영` and check the queued apply row carries the same preview id.
- Evidence: `qr-1-preview-queued.png`, `qr-2-preview-shown.png`, `qr-3-apply-queued.png`, `qr-4-db-jobs.json`.
- Page only: `shot /qr-attendance`.

## Gotchas

- Do not drive the direct path (`http://127.0.0.1:3100`, then `QR 명단 불러오기`) expecting a preview. It needs CH2CH credentials and Google, which are blank here, so it fails with an error by design.
- The fixture preview stands in for the Runner. It proves the queue, polling and rendering contract, not the Runner's CH2CH download or the Sheet write.
- After the apply job is queued, the page keeps polling for up to 6 minutes. The journey ends without completing it, so that is expected.
- With `APP_PUBLIC_ORIGIN` set, as in production, the phone path additionally requires that exact HTTPS origin. This instance leaves it empty, so any non-localhost Host counts as remote. `scripts/server/smoke-build.js` covers the pinned-origin variant at the API level.
- Observed 2026-11-19: in the 1·2·3부 and 4부 name lists, a 5-character name (`가상검증A`) renders truncated as `가상…`. This is a product layout issue, recorded here and not changed by this skill.
