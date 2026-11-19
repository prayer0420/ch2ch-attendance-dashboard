---
name: deploy-local
description: Rebuild and apply code or .env.local changes to the local CH2CH production server on this Windows PC (build, switch, restart web + Runner, verify, roll back on failure). Use after editing app/runner code or .env.local, or when the user asks to deploy, apply or restart.
---

# Deploy to the local CH2CH server

This PC runs CH2CH as a production build from `.local-runtime/server-build` or `.local-runtime/server-build-b`. The active one is recorded in `.local-runtime/active-build.json`. Web listens on `127.0.0.1:3000`. Autostart at sign-in uses `.local-runtime/autostart-local.ps1`.

## Steps

1. Run `npm.cmd run typecheck` first if code changed. It catches errors before anything is stopped.
2. Run the deploy **in the user's Terminal panel** (`mcp__terminal__run_in_terminal`), not the sandboxed Bash tool. The sandbox cannot see `%LOCALAPPDATA%` (where the data store lives) and must not own long-running servers.
   - Code changed: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .claude\skills\deploy-local\deploy.ps1`
   - Only `.env.local` changed: add `-SkipBuild`. It restarts on the current build, which re-reads `.env.local`.
3. Wait with `mcp__terminal__read_terminal` (use `wait_for_output_ms`). A build takes about 15–60s and the restart a few seconds.
4. Success ends with `[deploy] done: serving …`. Then run the `ch2ch-status` skill to confirm the heartbeat.

## Safety built into the script

- It refuses to run while attendance or QR jobs are queued or running (`check-idle.js`). Use `-Force` only if the user explicitly says so.
- It builds into the inactive slot, so a failed build never touches the running server.
- If the new build does not come up, it switches back to the previous build and starts that.
- It never touches business data, `.env.local` or the autostart shortcut.

Report what was deployed and the verification results to the user in Korean.
