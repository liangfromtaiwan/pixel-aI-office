const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petBridge", {
  syncStatus: async (status) => ipcRenderer.invoke("pet-status", status),
});
