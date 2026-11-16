import { app, BrowserWindow, ipcMain, Menu, screen } from "electron";
import path from "node:path";

app.setName("Truecast");

const isDev = process.env.NODE_ENV === "development";

// Disable the sandbox so the app runs without needing a setuid chrome-sandbox.
// (Electron refuses to start otherwise on systems where chrome-sandbox isn't
// owned by root with mode 4755.)
app.commandLine.appendSwitch("no-sandbox");
app.disableHardwareAcceleration();

/**
 * Bring the existing window forward. Clicking the dock/taskbar icon, or
 * launching the app again, must focus what is already open instead of
 * leaving it behind another window.
 */
function focusMainWindow() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) {
    createWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.moveTop();
  win.focus();
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    x: Math.max(0, Math.floor((width - 1000) / 2)),
    y: Math.max(0, Math.floor((height - 700) / 2)),
    frame: false,
    transparent: false,
    backgroundColor: "#0b1220",
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // A real menu keeps the standard accelerators (copy/paste, zoom, quit) but is
  // never drawn: Alt must not reveal a menu bar over a frameless window.
  win.setAutoHideMenuBar(false);
  win.setMenuBarVisibility(false);

  // The renderer draws a Restore glyph when the window is maximized.
  win.on("maximize", () => win.webContents.send("window-maximized", true));
  win.on("unmaximize", () => win.webContents.send("window-maximized", false));

  // Debug logging so we can see what the renderer is doing.
  win.webContents.on("did-finish-load", () => {
    console.log("[main] did-finish-load");
    win.show();
    win.focus();
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[main] did-fail-load code=${code} desc=${desc} url=${url}`);
  });

  win.webContents.on("console-message", (_e, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] render-process-gone", details);
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    console.log("[main] loading", indexPath);
    win.loadFile(indexPath);
  }

  return win;
}

// One process only: a second launch focuses the first window instead of
// opening a second one that nobody can see.
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });
}

if (hasInstanceLock) app.whenReady().then(() => {
  app.setAboutPanelOptions({
    applicationName: "Truecast",
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: "© 2026 Tarun Bansal · MIT licensed",
    credits: "A weather app that proves its numbers.\nData by Open-Meteo (CC BY 4.0). Not affiliated with Apple.",
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Truecast",
        submenu: [
          { role: "about" },
          // The menu bar is hidden by design, so the gear button in the title
          // bar is the visible entry point — this item exists for the
          // accelerator and for platforms that show the app menu.
          {
            label: "Settings…",
            accelerator: "CmdOrCtrl+,",
            click: () => {
              BrowserWindow.getFocusedWindow()?.webContents.send("open-settings");
            },
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      { label: "Window", submenu: [{ role: "minimize" }, { role: "close" }] },
    ]),
  );
  createWindow();

  app.on("activate", () => {
    focusMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Window control IPC
ipcMain.on("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on("window-toggle-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

ipcMain.handle("window-is-maximized", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win?.isMaximized() ?? false;
});
