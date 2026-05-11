const path = require("node:path");
const { app, BrowserWindow, ipcMain, screen } = require("electron");

let petWindow = null;
let moveInterval = null;
let motion = {
  mode: "idle",
  direction: 1,
  speed: 0,
};

function computeDockBounds() {
  const primary = screen.getPrimaryDisplay();
  const area = primary.workArea;
  const y = area.y + area.height - 220;
  return {
    minX: area.x,
    maxX: area.x + area.width - 280,
    y,
  };
}

function applyMode(status) {
  if (status === "thinking") {
    motion.mode = "pacing";
    motion.speed = 2;
  } else if (status === "working") {
    motion.mode = "focus";
    motion.speed = 1;
  } else if (status === "blocked") {
    motion.mode = "confused";
    motion.speed = 1.5;
  } else if (status === "done") {
    motion.mode = "happy";
    motion.speed = 2.5;
  } else {
    motion.mode = "idle";
    motion.speed = 0.4;
  }
}

function startEdgeMovement() {
  if (!petWindow) return;
  if (moveInterval) clearInterval(moveInterval);

  moveInterval = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) return;

    const bounds = petWindow.getBounds();
    const dock = computeDockBounds();
    const nextX = bounds.x + motion.direction * motion.speed;

    if (nextX <= dock.minX || nextX >= dock.maxX) {
      motion.direction *= -1;
    }

    const clampedX = Math.max(dock.minX, Math.min(dock.maxX, nextX));
    petWindow.setPosition(Math.round(clampedX), dock.y, false);
  }, 24);
}

function createWindow() {
  const dock = computeDockBounds();

  petWindow = new BrowserWindow({
    width: 280,
    height: 220,
    x: dock.minX + 24,
    y: dock.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.setAlwaysOnTop(true, "floating");
  petWindow.loadURL("http://localhost:3000/pet");
  startEdgeMovement();
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("pet-status", (_event, status) => {
    applyMode(status);
    return { ok: true };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (moveInterval) clearInterval(moveInterval);
  if (process.platform !== "darwin") app.quit();
});
