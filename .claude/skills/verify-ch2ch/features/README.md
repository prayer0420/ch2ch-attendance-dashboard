# CH2CH verification map

This directory is the maintained source for verifying the user-facing behavior of the CH2CH dashboard. Read this index first, then follow the matching feature file as the recipe.

## Baseline preconditions

- A production build exists in the active slot (`.local-runtime/active-build.json`).
- `node .claude/skills/verify-ch2ch/verify.cjs launch` printed `ready`, and `doctor` passes.
- The instance is `http://127.0.0.1:3100` with an empty throwaway DB and no Runner. Never drive `:3000`.

## Driving conventions

- Use `verify.cjs journey <name>` when a journey exists. Otherwise use `shot`, `api` and `db`.
- Handles are the Korean UI strings (labels and button names). Do not use coordinates or tab order.
- Each journey logs in through the real `/login` form. Do not reuse cookies across instances.

## Proof and skip reporting

- UI proof is a screenshot of the action and of the resulting state.
- Mutation proof is the DB row, plus any stored file in the throwaway data dir.
- If an entry point can't be reached, report it with the attempted command and the unmet precondition. Do not mark it verified through another path.

## Features

- [Login guard](./login.md): anonymous redirect, wrong-code rejection, login.
- [Attendance run from a file](./attendance-run.md): upload a CSV, load families, queue a run, view run detail.
- [Main screens](./screens.md): the eight main pages render while logged in.
- [QR attendance](./qr-attendance.md): phone path that queues the preview, renders the result and queues the apply step.
- [Worship journal](./worship-journal.md): page renders and lists journals. Publishing to Google or BAND is out of scope.
