const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const pty = require('node-pty');
const {
  resolveLaunchCwd,
  getExplorerIntegrationStatus,
  setExplorerIntegration,
} = require('./explorer-integration');

let mainWindow = null;
const ptys = new Map();
let nextTabId = 1;
const launchCwd = resolveLaunchCwd(process.argv, process.cwd(), process.execPath, app.isPackaged);

function resolveUnpackedPath(...segments) {
  const base = __dirname.replace(/app\.asar([\\/]|$)/i, 'app.asar.unpacked$1');
  const candidate = path.join(base, ...segments);
  if (fs.existsSync(candidate)) return candidate;
  return path.join(__dirname, ...segments);
}

function getShellConfig(shellType) {
  if (shellType === 'powershell') {
    const psInit = resolveUnpackedPath('shell', 'aether-init.ps1');
    const args = fs.existsSync(psInit)
      ? ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', psInit]
      : ['-NoLogo'];
    return {
      file: 'powershell.exe',
      args,
      label: 'PowerShell',
    };
  }
  const initScript = resolveUnpackedPath('shell', 'aether-init.cmd');
  const args = fs.existsSync(initScript)
    ? ['/k', 'call', initScript]
    : ['/k', 'cls'];
  return {
    file: process.env.ComSpec || 'cmd.exe',
    args,
    label: 'Aether',
  };
}

function getAppIconPath() {
  return path.join(__dirname, '..', 'assets', 'aether.ico');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 680,
    minWidth: 640,
    minHeight: 400,
    frame: false,
    backgroundColor: '#0c0e17',
    show: false,
    title: 'Aether',
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state', { maximized: true });
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state', { maximized: false });
    }
  });

  mainWindow.on('closed', () => {
    for (const [, entry] of ptys) {
      try {
        entry.ptyProcess.kill();
      } catch (_) {}
    }
    ptys.clear();
    mainWindow = null;
  });
}

// IPC: Spawn a new PTY tab
ipcMain.handle('pty:create', (_event, { shellType = 'cmd', cols = 100, rows = 30, cwd } = {}) => {
  const id = `tab-${nextTabId++}`;
  const config = getShellConfig(shellType);
  const startDir = cwd || launchCwd || os.homedir();

  const env = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'Aether',
    WT_SESSION: crypto.randomUUID(),
  };

  const ptyOpts = {
    name: 'xterm-256color',
    cols: Math.max(20, cols),
    rows: Math.max(5, rows),
    cwd: startDir,
    env,
    useConpty: true,
    useConptyDll: true,
  };

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(config.file, config.args, ptyOpts);
  } catch (_) {
    ptyProcess = pty.spawn(config.file, config.args, {
      ...ptyOpts,
      useConptyDll: false,
    });
  }

  ptys.set(id, { ptyProcess, shellType, label: config.label });

  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:data', { id, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    ptys.delete(id);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty:exit', { id, exitCode });
    }
  });

  return {
    id,
    shellType,
    label: config.label,
    pid: ptyProcess.pid,
    cwd: startDir,
  };
});

ipcMain.on('pty:write', (_event, { id, data }) => {
  const entry = ptys.get(id);
  if (entry) {
    entry.ptyProcess.write(data);
  }
});

ipcMain.on('pty:resize', (_event, { id, cols, rows }) => {
  const entry = ptys.get(id);
  if (entry && cols > 0 && rows > 0) {
    try {
      entry.ptyProcess.resize(cols, rows);
    } catch (_) {}
  }
});

ipcMain.on('pty:kill', (_event, { id }) => {
  const entry = ptys.get(id);
  if (entry) {
    try {
      entry.ptyProcess.kill();
    } catch (_) {}
    ptys.delete(id);
  }
});

// Window controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window:opacity', (_event, opacity) => {
  if (!mainWindow) return;
  const clamped = Math.min(1, Math.max(0.65, Number(opacity) || 1));
  mainWindow.setOpacity(clamped);
});

ipcMain.on('shell:openExternal', (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

ipcMain.handle('system:getExplorerIntegration', () => {
  return {
    ...getExplorerIntegrationStatus(),
    supported: process.platform === 'win32' && app.isPackaged,
  };
});

ipcMain.handle('system:setExplorerIntegration', (_event, enabled) => {
  if (process.platform !== 'win32' || !app.isPackaged) {
    return { ok: false, enabled: false, error: 'Available in installed Aether builds' };
  }
  return setExplorerIntegration(Boolean(enabled), process.execPath);
});

app.setAppUserModelId('com.aether.terminal');

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
