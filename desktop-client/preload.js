const { contextBridge, ipcRenderer } = require('electron');
if (process.isMainFrame && location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('ch2chClient', {
    getConfig: () => ipcRenderer.invoke('client-config'),
    connect: value => ipcRenderer.invoke('client-connect', value)
  });
}
