const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ch2ch", {
  getStatus: () => ipcRenderer.invoke("get-status"),
  openDashboard: () => ipcRenderer.invoke("open-dashboard"),
  stopServices: () => ipcRenderer.invoke("stop-services"),
  onStatus: (callback) => ipcRenderer.on("service-status", (_event, payload) => callback(payload))
});
