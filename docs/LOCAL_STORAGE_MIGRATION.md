# Local storage migration — activated 2026-11-16

Requested scope: preserve existing data; replace Supabase for attendance, QR,
worship journals while retaining mobile access. User approved leaving 66 historical
input attachments in Supabase; local cutover completed on 2026-11-16.

## Verified backup

- Directory: `C:/Users/c/AppData/Local/CH2CH-Backups/local-migration-20261115-103424`
- Current source/configuration/local journal snapshots: 843 files, SHA-256 verified.
- Git history: bundle verified. Existing dirty/untracked application work preserved.
- Access restricted to the current Windows user and SYSTEM. Includes private settings;
  never commit, distribute, or upload the backup.
- Supabase management SQL was used read-only, because REST/Storage return HTTP 402
  `exceed_egress_quota`. Unrelated `ai_atlas_*` tables share this project and MUST NOT
  be modified or migrated as part of attendance work.
- Application DB export: 34,285 rows across eight tables. Page counts, unique IDs and
  attendance foreign-key references verified. See `verified-database-manifest.json`.
- Counts: attendance_runs 62; attendance_results 10,905; attendance_members 0;
  attendance_weekly_records 2,854; run_events 20,461; app_settings 1;
  runner_heartbeats 2; qr_sync_jobs 0.
- No queued/running attendance jobs at export time; all 62 historical runs terminal.

## Historical attachments preserved remotely

Storage inventory contains 66 attendance-inputs objects (3,266,899 bytes).
Their metadata is backed up; their binary contents are NOT backed up.
Both Storage listing and authenticated object download return 402. The local
legacy attendance.csv does not match any inventory checksum. Do not reconstruct
historical snapshots from the current Google Sheet or claim a complete backup.

Chosen option: keep original attachments untouched in Supabase and permit
local cutover with these historical inputs explicitly unavailable until retrieval.
The local file reader reports this clearly; it does not silently use today's Sheet
as a replacement for historical data. New runs save fresh snapshots to this PC.
Never delete/pause the shared Supabase project or automatically replay old jobs.

## Implemented and verified

- Shared `lib/local-store/provider.cjs`: SQLite WAL, full synchronous commits,
  busy timeout, parameterized queries, indexed lookups, atomic conditional claims,
  private uploads with traversal/link rejection. No new network DB port.
- Exact import of 34,285 application rows and 11 current worship journals. Backup
  hashes, row content equality and SQLite integrity verified. No old jobs replayed.
- Web, Runner, upload/download, preflight/heartbeat/startup all use the same provider.
- Journal creation and PDF export lookup now read the local DB, not the old JSON file.
  Journal persistence is transactional by date; concurrent different dates are retained.
- ngrok Host-based QR queue routing fixed: Next's internal localhost URL no longer
  misclassifies a mobile reverse-proxy request as direct local execution.
- Isolated tests cover two-process claim competition, transaction rollback, booleans,
  filters, upserts, reference checks, file safety, Runner/QR handoff and journals.
- Regression tests passed: Runner recovery; QR job/mobile/time/selection;
  worship final validation and review digest.
- Production build passed (active `.local-runtime/server-build-b`). Runtime SQLite
  uses Node's createRequire because Next 15 Turbopack cannot bundle node:sqlite directly.
- Isolated real HTTP test passed: login guard, 8 screens, input upload/readback,
  mobile-proxy QR queue/status, journal listing. Fixture DB only, no live Runner.
- After controlled restart: historical runs/results/events/weekly/journals, anonymous
  401, authenticated pages, fresh online Runner heartbeat passed on port 3000.
- Public HTTPS login/cookie/CSRF/Runner checks passed. At 390px width, attendance,
  QR and worship pages had no horizontal overflow; all 11 saved journals displayed.
- No real CH2CH attendance updates, Google Sheet publication, or BAND posts were
  performed as tests. These external business writes are deliberately not claimed
  as end-to-end verified. Parsing/Google/business logic otherwise remains unchanged.

## Operating paths and backup

- Data directory: `C:/Users/c/AppData/Local/CH2CH-Server/5BC262ED743FC945/data-v1`
- DB: `attendance.sqlite` (plus its SQLite WAL/SHM companions while running).
- New input files: `files/attendance-inputs/` inside that directory.
- Selector: sibling `storage-provider.json`; Node web and Runner read this on startup/use.
  Existing .env.local and Supabase credentials were preserved for rollback, but local
  operation no longer calls the Supabase DB/Storage APIs.
- Directory ACL: current Windows user + SYSTEM. Never move the active DB into OneDrive,
  public/, Git, or a packaged client. Browser clients only use authenticated server APIs.
- Additional pre-change source/config backup: `C:/Users/c/AppData/Local/CH2CH-Backups/local-migration-20261116-090021` (845 verified files + Git bundle).
- Initial consistent SQLite backup: `data-v1/backups/2026-11-16T00-15-35-668Z`.
- Manual backup: from the project folder, `node scripts/local-store/backup.cjs`.
  Uses SQLite's backup API rather than copying an active DB file. No new scheduled
  backup/automation was installed. For disaster recovery, an additional protected
  off-PC backup is still recommended; these backups are on the same physical PC.
- Existing Windows logon startup shortcut and Runner guard remain installed. This
  runs after Windows user login, not while the PC is powered off. No reboot was
  performed as a test. Existing ngrok tunnel was restarted at the approved origin:
  `https://bonanza-opulently-quack.ngrok-free.dev` → `127.0.0.1:3000`.

## Rollback / restoration precautions

Before any restore, stop and verify ownership of web + Runner and ensure no active
jobs. Take another local snapshot. Preserve the entire data directory including
attachments. Restore into a NEW private directory, check `PRAGMA integrity_check`,
counts and referenced files, then point the selector to that verified directory.
Never overwrite only attendance.sqlite while a process still has its WAL open.
Do not switch back to cloud/old builds after new local jobs have run without first
reconciling those new records; the cloud no longer receives local changes.

The one-time `scripts/local-store/cutover.ps1` is intended for Windows PowerShell
(`powershell.exe`), matching the existing lifecycle scripts. PowerShell 7's JSON
date coercion makes the older strict process-identity helper reject valid PIDs;
the initial PowerShell 7 cutover safely stopped before any service was terminated.
The verified switch used Windows PowerShell. Future regular deployments use
`deploy-server.cmd`; do not re-run the one-time import/activation scripts.

Utilities: `scripts/release/backup-local-migration.ps1` and
`scripts/release/verify-local-migration-backup.js`. The first failed backup directory
`local-migration-20261115-103335` is incomplete (locked runtime log) and is not the
verified backup. It remains untouched; the successful run excludes runtime logs.
