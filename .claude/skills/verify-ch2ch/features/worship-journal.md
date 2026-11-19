# Worship journal

`예배일지 자동 작성` builds the weekly worship journal from the bulletin, the accounting data, and manual entries for purpose offerings and newcomers. It saves the journal on this PC and can export a PNG or PDF, publish to the Google Sheet, and post to BAND.

## Sub-features

- `journal.page`: `/worship-journal` renders, with the inputs in this order: `회계 자료`, `목적헌금 수기 입력`, `새가족 수기 입력`.
- `journal.list`: `GET /api/worship-journals` returns `{ journals: [] }` on an empty DB.
- `journal.publish`: Google Sheet and BAND publishing. Out of scope: the credentials are blanked on this instance, and a real post would be visible to others.

## How to get to it (user POV)

- Sidebar `예배일지`.

## Driving it with verify.cjs

Preconditions: baseline state.

- Page: `shot /worship-journal`, then check in the screenshot that the three headings appear in order.
- List: `api GET /api/worship-journals`. HTTP 200 with a `journals` array is the pass.

## Gotchas

- Google and BAND buttons fail on this instance because their credentials are empty. That is by design, so don't treat it as a product bug.
- `scripts/server/smoke-build.js` also asserts the heading order. Keep the two in sync if the layout changes.
