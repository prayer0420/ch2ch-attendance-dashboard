const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

function canStopProcess(record, expected) {
  return Boolean(
    record && expected &&
    Number(record.pid) === Number(expected.pid) &&
    String(record.startedAt) === String(expected.startedAt)
  );
}

function serviceStatusFromProcess(processInfo) {
  return {
    state: processInfo?.running ? "running" : "stopped",
    pid: processInfo?.pid || null
  };
}

function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (_) {
    return false;
  }
}

function appendProcessLog(stream, filePath) {
  const output = fs.createWriteStream(filePath, { flags: "a" });
  stream.pipe(output);
  return output;
}

function spawnService({ nodePath, args, rootDir, stdoutPath, stderrPath }) {
  const child = spawn(nodePath, args, {
    cwd: rootDir,
    env: process.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  appendProcessLog(child.stdout, stdoutPath);
  appendProcessLog(child.stderr, stderrPath);
  return child;
}

function startServices({ rootDir, nodePath, port = 3000, logDir }) {
  fs.mkdirSync(logDir, { recursive: true });
  const dashboard = spawnService({
    nodePath,
    args: [path.join(rootDir, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(port)],
    rootDir,
    stdoutPath: path.join(logDir, "dashboard.out.log"),
    stderrPath: path.join(logDir, "dashboard.err.log")
  });
  const runner = spawnService({
    nodePath,
    args: [path.join(rootDir, "runner", "src", "runner.js")],
    rootDir,
    stdoutPath: path.join(logDir, "runner.out.log"),
    stderrPath: path.join(logDir, "runner.err.log")
  });
  const startedAt = new Date().toISOString();
  return {
    dashboard: { pid: dashboard.pid, startedAt },
    runner: { pid: runner.pid, startedAt },
    children: { dashboard, runner }
  };
}

function readServiceStatus(state) {
  return {
    dashboard: serviceStatusFromProcess({
      pid: state?.dashboard?.pid,
      running: isProcessRunning(state?.dashboard?.pid)
    }),
    runner: serviceStatusFromProcess({
      pid: state?.runner?.pid,
      running: isProcessRunning(state?.runner?.pid)
    })
  };
}

function stopPid(pid) {
  if (!isProcessRunning(pid)) return;
  const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  killer.unref();
}

function stopServices(state) {
  for (const name of ["dashboard", "runner"]) {
    const record = state?.[name];
    if (!canStopProcess(record, state?.[name])) continue;
    stopPid(record.pid);
  }
}

function waitForHttp(url, timeoutMs = 45000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          resolve(response.statusCode);
          return;
        }
        retry();
      });
      request.on("error", retry);
      request.setTimeout(1500, () => request.destroy());
    };
    const retry = () => {
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`${url} 응답 대기 시간이 초과되었습니다.`));
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

module.exports = {
  canStopProcess,
  serviceStatusFromProcess,
  startServices,
  readServiceStatus,
  stopServices,
  waitForHttp
};
