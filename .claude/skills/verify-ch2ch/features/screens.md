# Main screens

Every main page renders for a logged-in user without redirecting back to login.

## Sub-features

- `screens.dashboard`: `/` shows stat cards, `최근 실행` and `로컬 실행 상태` (offline on this instance, because there is no Runner).
- `screens.pages`: `/runs/new`, `/qr-attendance`, `/worship-journal`, `/search`, `/attendance`, `/minutes` and `/settings` all return 200.

## How to get to it (user POV)

- Use the sidebar: 대시보드, 교인 검색, QR 출석체크, 출석 실행, 예배일지, 설정. The others are linked from those pages.

## Driving it with verify.cjs

Preconditions: baseline state.

- Run `journey screens`. It logs in, opens each of the 8 pages, requires HTTP 200 with no `/login` redirect, and takes a full-page screenshot of each.
- Evidence: `screens_<path>.png` files and a PASS line in `journeys.log`.
- For one page only, use `shot /<path>`.

## Gotchas

- The dashboard shows `오프라인` for the Runner on this instance. That is expected, not a failure.
- With an empty DB most lists show their empty states. Seed through other journeys (for example `attendance-file-run`) first if a non-empty view is needed.
