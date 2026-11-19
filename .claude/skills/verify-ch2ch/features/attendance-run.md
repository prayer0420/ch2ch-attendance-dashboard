# Attendance run from a file

On `출석 실행 → 새 실행 요청`, the user picks a data source (Google Sheet URL or file upload), loads families, adjusts the per-family reservations, and presses `실제 출석체크 시작`. This queues a run that the local Runner later saves to CH2CH. The user then lands on `/runs/<id>`, which shows `대기 중` until the Runner picks it up.

## Sub-features

- `run.file-upload`: CSV, XLSX, XLS or PDF via `파일 업로드`.
- `run.load-families`: `시트/파일에서 가족 불러오기` lists the families and members from the file.
- `run.reserve`: the per-family 주일 and 부서 modes (시트 원본, 체크 예약, 해제 예약) and the bulk `전체 원본대로` and `전체 해제 예약` buttons.
- `run.queue`: `실제 출석체크 시작` plus the browser confirm creates a run with `status=queued` and stores an upload snapshot.
- `run.detail`: `/runs/<id>` shows the week title, the `대기 중` badge, and the progress and result panels.
- `run.sheet-source`: the Google Sheet URL source. Not driven yet, because it needs network access and a real sheet.
- `run.clear-week`: the `웹교적 주차 전체 해제` operation. Not driven yet.

## How to get to it (user POV)

- Sidebar `출석 실행`, then `/runs/new`.
- The dashboard's recent-runs table links to `/runs/<id>`.

## Driving it with verify.cjs

Preconditions: baseline state. The journey writes its own fixture CSV with the header `가족,이름,주일,부서` and one row, `검증가족,가상검증,O,X`.

- Run `journey attendance-file-run`. It logs in, opens `/runs/new`, clicks `파일 업로드`, sets the file input, clicks `시트/파일에서 가족 불러오기`, waits for `검증가족`, clicks `실제 출석체크 시작`, accepts the confirm, waits for `/runs/<id>` and `대기 중`, then reads the row from the throwaway DB.
- Pass condition: the DB row has `status=queued`, `source_file_path` is set, and that file exists under `<dataDir>/files/attendance-inputs/`.
- Evidence: `attendance-1-families-loaded.png`, `attendance-2-run-detail.png`, `attendance-3-db-row.json`, `fixture-attendance.csv`.

## Gotchas

- The confirm dialog says it saves to CH2CH "실제" (for real). That is true on `:3000`. On this instance no Runner exists, so the run stays queued. Never run this journey against `:3000`.
- The detail page shows `0 / 0명 처리` while queued. The counts are filled in by the Runner, so this is not a failure.
- Each run of the journey adds another queued row to the throwaway DB. That is harmless, and cleanup deletes the DB.
- The week defaults from today's date. The journey does not pin it, so the DB row's `target_week` follows the calendar.
