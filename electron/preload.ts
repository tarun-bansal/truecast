import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  toggleMaximize: () => ipcRenderer.send("window-toggle-maximize"),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: unknown, maximized: boolean) => callback(maximized);
    ipcRenderer.on("window-maximized", handler);
    return () => ipcRenderer.removeListener("window-maximized", handler);
  },
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("open-settings", handler);
    return () => ipcRenderer.removeListener("open-settings", handler);
  },
});
