const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { app, BrowserWindow, ipcMain } = require("electron");
const {
  startServices,
  readServiceStatus,
  stopServices,
  waitForHttp
} = require("./process-manager");

const DASHBOARD_URL = "http://localhost:3000/runs/new";
let windowRef = null;
let serviceState = null;
let stopping = false;

function projectRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "project")
    : path.resolve(__dirname, "..");
}

function resolveNodePath() {
  const configured = process.env.CH2CH_NODE_PATH;
  if (configured && fs.existsSync(configured)) return configured;
  const defaultPath = "C:\\Program Files\\nodejs\\node.exe";
  if (fs.existsSync(defaultPath)) return defaultPath;
  try {
    return execFileSync("where.exe", ["node"], { encoding: "utf8" }).split(/\r?\n/)[0].trim();
  } catch (_) {
    throw new Error("Node.js를 찾지 못했습니다. Node.js LTS를 설치한 뒤 앱을 다시 실행해 주세요.");
  }
}

function recentLog(name) {
  const file = path.join(projectRoot(), ".local-runtime", name);
  try {
    return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).slice(-12);
  } catch (_) {
    return [];
  }
}

function statusPayload(error = null) {
  return {
    services: serviceState ? readServiceStatus(serviceState) : { dashboard: { state: "stopped" }, runner: { state: "stopped" } },
    logs: [...recentLog("dashboard.err.log"), ...recentLog("runner.err.log")].slice(-20),
    error
  };
}

function sendStatus(error = null) {
  if (windowRef && !windowRef.isDestroyed()) windowRef.webContents.send("service-status", statusPayload(error));
}

async function startLocalServices() {
  const root = projectRoot();
  if (!fs.existsSync(path.join(root, ".env.local"))) {
    throw new Error(".env.local이 없습니다. 프로젝트 폴더에 .env.local을 만들고 CH2CH 및 Supabase 설정을 입력해 주세요.");
  }
  if (!fs.existsSync(path.join(root, "node_modules"))) {
    throw new Error("node_modules가 없습니다. 프로젝트 폴더에서 npm install을 한 번 실행해 주세요.");
  }
  serviceState = startServices({
    rootDir: root,
    nodePath: resolveNodePath(),
    port: 3000,
    logDir: path.join(root, ".local-runtime")
  });
  sendStatus();
  await waitForHttp(DASHBOARD_URL, 45000);
  if (windowRef && !windowRef.isDestroyed()) await windowRef.loadURL(DASHBOARD_URL);
  sendStatus();
}

function createWindow() {
  windowRef = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "CH2CH 출석체크",
    backgroundColor: "#f5f1e8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });
  windowRef.loadFile(path.join(__dirname, "renderer", "index.html"));
  windowRef.on("closed", () => { windowRef = null; });
}

ipcMain.handle("get-status", () => statusPayload());
ipcMain.handle("open-dashboard", async () => {
  if (windowRef && !windowRef.isDestroyed()) await windowRef.loadURL(DASHBOARD_URL);
  return true;
});
ipcMain.handle("stop-services", () => {
  if (serviceState) stopServices(serviceState);
  serviceState = null;
  sendStatus();
  return true;
});

app.whenReady().then(async () => {
  createWindow();
  try {
    await startLocalServices();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendStatus(message);
  }
});

app.on("before-quit", (event) => {
  if (stopping || !serviceState) return;
  event.preventDefault();
  stopping = true;
  stopServices(serviceState);
  serviceState = null;
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
