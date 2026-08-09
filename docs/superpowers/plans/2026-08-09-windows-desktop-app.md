# CH2CH Windows Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing local Dashboard and Runner into an installable Windows Electron app that starts, monitors, and stops only its own processes.

**Architecture:** Electron is the desktop shell. The main process starts the existing Next.js Dashboard and Node Runner from the installed project directory, waits for `localhost:3000`, and loads the existing run page in a BrowserWindow. A preload bridge exposes read-only status and log operations to a small startup screen; the existing web application remains the source of truth for attendance workflows.

**Tech Stack:** Electron, electron-builder NSIS, existing Next.js/Node Runner, PowerShell-free child-process lifecycle, Node test scripts.

## Global Constraints

- Windows installation is the first target; macOS and Linux are out of scope.
- `.env.local` and CH2CH credentials are never bundled into GitHub or the installer.
- The app terminates only processes recorded with its own PID and start time.
- Existing CH2CH automation logic is reused without behavior changes.
- `npm run typecheck`, `npm run build`, and desktop lifecycle tests must pass.

---

### Task 1: Add Desktop Process-Lifecycle Utilities

**Files:**
- Create: `desktop/process-manager.js`
- Test: `scripts/verify-desktop-process-manager.js`
- Modify: `package.json`

**Interfaces:**
- Produces `startServices({ rootDir, nodePath, port, url, logDir })`, `stopServices(state)`, `readServiceStatus(state)`, and `waitForHttp(url, timeoutMs)`.
- State entries contain `pid` and `startedAt`; stopping validates both before calling `taskkill /T /F`.

- [ ] **Step 1: Write failing lifecycle tests**

Test pure state behavior with a temporary fake state and a mocked process inspector. Assert that a mismatched start time is not terminated and that a matching process is selected for termination.

- [ ] **Step 2: Run the test and confirm it fails because the module is missing**

Run `node scripts/verify-desktop-process-manager.js`.

- [ ] **Step 3: Implement the minimal process manager**

Use `child_process.spawn` with the existing commands: Next Dashboard on port 3000 and `runner/src/runner.js`. Redirect stdout/stderr into `.local-runtime`. Keep PID/start-time state in `.local-runtime/desktop-processes.json`.

- [ ] **Step 4: Run the lifecycle tests**

Run `node scripts/verify-desktop-process-manager.js` and confirm PASS.

- [ ] **Step 5: Commit**

Commit as `feat: add desktop service lifecycle manager`.

### Task 2: Create Electron Shell and Startup Screen

**Files:**
- Create: `desktop/main.js`
- Create: `desktop/preload.js`
- Create: `desktop/renderer/index.html`
- Create: `desktop/renderer/renderer.js`
- Create: `desktop/renderer/styles.css`

**Interfaces:**
- Main process starts the process manager on `app.whenReady()` and sends `service-status`, `service-log`, and `startup-error` messages.
- Renderer calls `window.ch2ch.openDashboard()`, `window.ch2ch.stopServices()`, and `window.ch2ch.getStatus()` through the preload bridge.

- [ ] **Step 1: Add a renderer test fixture for startup states**

Define the state labels `준비 중`, `실행 중`, `오류`, and `종료됨` in a small exported formatter and assert the four mappings in `scripts/verify-desktop-ui-state.js`.

- [ ] **Step 2: Run the UI-state test and confirm it fails**

Run `node scripts/verify-desktop-ui-state.js` before creating the formatter.

- [ ] **Step 3: Implement the Electron main process and preload bridge**

Use a `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`. Keep the startup window lightweight and open `http://localhost:3000/runs/new` in the same app window after the Dashboard responds.

- [ ] **Step 4: Implement the startup screen**

Show Dashboard status, Runner status, recent log lines, an `홈페이지 열기` button, and a `종료` button. Do not show environment values or passwords.

- [ ] **Step 5: Run UI-state and type checks**

Run `node scripts/verify-desktop-ui-state.js` and `npm.cmd run typecheck`.

- [ ] **Step 6: Commit**

Commit as `feat: add electron desktop shell`.

### Task 3: Add Installer Configuration

**Files:**
- Modify: `package.json`
- Create: `desktop/README.md`
- Create: `desktop/installer/README.md`
- Modify: `.gitignore`

**Interfaces:**
- `npm run desktop:dev` launches the Electron shell against the current project.
- `npm run desktop:dist` creates an NSIS installer in `dist/`.

- [ ] **Step 1: Add package scripts and electron dependencies**

Add `electron` and `electron-builder` as development dependencies, and configure `build.appId`, product name, NSIS target, desktop shortcut, and excluded secrets.

- [ ] **Step 2: Add installation instructions**

Document that `.env.local` is created after installation and that Playwright Chromium must be installed once with `npm run install-browsers`.

- [ ] **Step 3: Build the installer**

Run `npm.cmd run desktop:dist`. Confirm a Windows installer is produced under `dist/` and no `.env.local` file is included.

- [ ] **Step 4: Commit**

Commit as `build: package ch2ch windows installer`.

### Task 4: Verify Installed-App Lifecycle and Documentation

**Files:**
- Create: `scripts/verify-desktop-package.js`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-09-windows-desktop-app-design.md`

**Interfaces:**
- The verification script checks package metadata, secret exclusion, launcher files, and that the local URL becomes reachable after startup.

- [ ] **Step 1: Write the package verification assertions**

Assert that the build configuration targets NSIS, `.env.local` is excluded, and the app declares the expected start and stop behavior.

- [ ] **Step 2: Run verification and confirm the expected failures**

Run `node scripts/verify-desktop-package.js` before packaging is configured.

- [ ] **Step 3: Implement the verification script and documentation**

Add a Korean quick-start guide: install, create `.env.local`, install browser, launch the app, run a dry-run, then close the app.

- [ ] **Step 4: Run the complete verification set**

Run sequentially:

```powershell
npm.cmd run verify:desktop-process
npm.cmd run verify:desktop-ui
npm.cmd run verify:desktop-package
npm.cmd run typecheck
npm.cmd run build
npm.cmd run desktop:dist
```

- [ ] **Step 5: Commit**

Commit as `test: verify windows desktop packaging`.
