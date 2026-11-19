---
name: ch2ch-status
description: Read-only health check of the local CH2CH server on this Windows PC (web on 127.0.0.1:3000, Runner, Runner guard, heartbeat, job queue, autostart log). Use when the user asks if the service is up, after a reboot, or before/after a deploy.
---

# CH2CH status

Run the read-only check **in the user's Terminal panel** (`mcp__terminal__run_in_terminal`), not the sandboxed Bash tool: the local data store lives under `%LOCALAPPDATA%`, which the sandbox cannot see.

```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .claude\skills\ch2ch-status\status.ps1
```

Then read the output with `mcp__terminal__read_terminal`.

## How to read it

- Healthy: dashboard and runner `RUNNING`, runner guard `RUNNING`, port 3000 on `127.0.0.1`, `/login=200`, `/api/app=401`, heartbeat `online` and less than 60s old, startup link `registered`.
- `queued`/`running` counts above 0 mean work is in progress. Do not restart or deploy until it finishes.
- `/login=0` or port 3000 not listening means the web server is down. Check the `autostart` log lines and the newest `.local-runtime/dashboard-*.err.log`.
- Heartbeat `STALE` while the runner is `RUNNING` means the Runner is stuck. Look at the runner error log shown at the bottom.

The check changes nothing and prints no secrets. Report the results to the user in Korean, in a short summary.
