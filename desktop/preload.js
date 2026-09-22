const { contextBridge, ipcRenderer } = require("electron");

// Privileged launcher APIs must not be exposed to web pages or embedded frames.
if (process.isMainFrame && location.protocol === "file:") contextBridge.exposeInMainWorld("ch2ch", {
  getStatus: () => ipcRenderer.invoke("get-status"),
  openDashboard: () => ipcRenderer.invoke("open-dashboard"),
  stopServices: () => ipcRenderer.invoke("stop-services"),
  onStatus: (callback) => ipcRenderer.on("service-status", (_event, payload) => callback(payload))
});
