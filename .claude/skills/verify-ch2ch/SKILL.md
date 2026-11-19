---
name: verify-ch2ch
description: Drive the CH2CH attendance dashboard (Next.js web UI) the way a user does, on an isolated throwaway instance at 127.0.0.1:3100, and capture screenshot and DB evidence. Use to prove a UI or API change works (login, attendance run from a file, main screens) before or after deploy-local. It never touches the live server on :3000, its data, or CH2CH/BAND/Google.
---

# Verify CH2CH

Surface: the web dashboard (Next.js 15 production build). Harness: `verify.cjs` (Node, Playwright Chromium, already installed via `npm.cmd run install-browsers`). Other surfaces, not covered here: the Runner, which does the real CH2CH browser automation, and the Electron shells in `desktop/` and `desktop-client/`.

Run every command **in the user's Terminal panel** (`mcp__terminal__run_in_terminal`, cwd = repo root). Do not use the sandboxed Bash tool: it cannot see `%TEMP%` the same way, and it must not own the server process.

## Safety model

`launch` starts a copy of the **active production build** (`.local-runtime/active-build.json`) on `127.0.0.1:3100` with:

- a throwaway random access code and session secret, stored only in the run's `state.json` and deleted at cleanup;
- a throwaway SQLite DB in `%TEMP%\ch2ch-verify-*`;
- `CH2CH_*`, `QR_WORKER_TOKEN`, `BAND_*`, `GOOGLE_*`, `SUPABASE_*`, `APP_PUBLIC_ORIGIN` set to empty, so Next does not refill them from `.env.local`;
- no Runner attached.

So "실제 출석체크 시작" on this instance only queues a row in the throwaway DB. Nothing reaches CH2CH, BAND, Google or the live data. Never point a journey at `:3000`.

It verifies the **built** code. After editing source, build first with the `deploy-local` skill, or `node scripts/server/build.js` followed by `node scripts/server/build-slots.js set <BUILD_DIR>`. Only one run at a time, because the port is fixed. `launch` refuses if :3100 is busy.

## Launch

```
node .claude/skills/verify-ch2ch/verify.cjs launch
```

It is ready when it prints `[verify] ready run=<id> url=http://127.0.0.1:3100 …`. It starts from an empty DB, creates the schema itself, and logs in once. This takes about 5–15s. Server output goes to `.local-runtime/verify/<id>/server.log`.

## Doctor

```
node .claude/skills/verify-ch2ch/verify.cjs doctor
```

Read-only. It checks that the pid is our `next start` on :3100, `/login`=200, anonymous `/api/app`=401, logged-in `/api/app`=200, and that the DB is the throwaway temp one. Run it before the first drive and after any failed drive. Every command defaults to the latest run, or you can pass a run id as the last argument.

## Drive

Built-in Playwright journeys use real handles from the app: the label `접속 코드`, the buttons `들어가기`, `파일 업로드`, `시트/파일에서 가족 불러오기` and `실제 출석체크 시작`, and the status text `대기 중`.

```
node .claude/skills/verify-ch2ch/verify.cjs journey login
node .claude/skills/verify-ch2ch/verify.cjs journey attendance-file-run
node .claude/skills/verify-ch2ch/verify.cjs journey qr-mobile-queue
node .claude/skills/verify-ch2ch/verify.cjs journey screens
```

Ad-hoc helpers:

```
node .claude/skills/verify-ch2ch/verify.cjs shot /worship-journal          # logged-in full-page screenshot
node .claude/skills/verify-ch2ch/verify.cjs api GET /api/runs              # authed API call, body saved as evidence
node .claude/skills/verify-ch2ch/verify.cjs api POST /api/qr-attendance '{"action":"preview",...}'
node .claude/skills/verify-ch2ch/verify.cjs db                             # read-only counts and last runs in the throwaway DB
```

To add a journey, add a function to `JOURNEYS` in `verify.cjs` and a matching file under `features/`. Prefer `getByRole` and `getByLabel` with the Korean UI text over CSS selectors.

## Evidence

Everything goes to `.local-runtime/verify/<id>/evidence/` (git-ignored):

- screenshots for each journey step, and `<journey>-FAILED.png` on failure;
- `journeys.log`, with one PASS line per journey;
- `api-*.txt` files with the request and response;
- `db-*.json` and `attendance-3-db-row.json` as side-effect proof.

Proof standards: drive the real UI path, not test endpoints. Capture both the action and the resulting state. Check side effects in the DB (row status, stored upload snapshot) alongside the screen.

## Cleanup

```
node .claude/skills/verify-ch2ch/verify.cjs cleanup
```

Cleanup does the following:

- kills only the recorded pid, after checking it is our `next … 3100` process;
- deletes the throwaway data dir;
- strips the password and cookie from the run state and renames it to `state.closed.json`;
- keeps `evidence/` and `server.log`.

Run cleanup after every failed iteration too. Old evidence folders can be deleted by hand when no longer needed.

## Feature map

See [features/README.md](features/README.md). Keep it current with `/maintain-verification-skill`.
