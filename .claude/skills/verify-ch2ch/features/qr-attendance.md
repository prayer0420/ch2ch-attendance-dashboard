# QR attendance queue

`QR 출석체크` loads the QR attendance targets for a week from a Google Sheet and applies them to CH2CH. A direct request from this PC can run immediately. A request from a phone through the public HTTPS origin is queued for the Runner, and the page polls for the job's status.

## Sub-features

- `qr.page`: `/qr-attendance` renders `2청년회 QR 출석 대상`, `반영 규칙` and `실제 반영`.
- `qr.queue`: a POST to `/api/qr-attendance` with `action:"preview"` from the public origin returns 202 with a `jobId`. A GET with `?jobId=` returns `queued`.
- `qr.apply`: the real apply step. Out of scope, because it needs the Runner and CH2CH.

## How to get to it (user POV)

- Sidebar `QR 출석체크`.

## Driving it with verify.cjs

Preconditions: baseline state.

- Page: `shot /qr-attendance`.
- Queue: not yet a journey. On this instance `APP_PUBLIC_ORIGIN` is empty, so a local preview POST takes the direct path and needs Google Sheets network access. To prove the mobile queue path, use the reverse-proxy fixture in `scripts/server/smoke-build.js`, which sets `APP_PUBLIC_ORIGIN=https://mobile.fixture.test`.

## Gotchas

- A direct preview fetches the real Google Sheet URL you pass. Use a fixture URL or expect a network error. It never writes to CH2CH without a Runner.
- This feature has no UI journey yet. Adding one is the next gap to close.
