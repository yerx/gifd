import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const SERVER_PORT = 3001;

function getResourcePath(...segments: string[]): string {
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..', '..');
  return path.join(basePath, ...segments);
}

function getDbDir(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getStaticDir(): string {
  return getResourcePath('web', 'out');
}

function getServerEntry(): string {
  return getResourcePath('server', 'index.js');
}

async function startServer(): Promise<void> {
  const serverEntry = getServerEntry();
  const staticDir = getStaticDir();
  const dbDir = getDbDir();

  console.log(`[electron] Starting server...`);
  console.log(`[electron] Server entry: ${serverEntry}`);
  console.log(`[electron] Static dir: ${staticDir}`);
  console.log(`[electron] DB dir: ${dbDir}`);

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      GROUNDWORK_DB_DIR: dbDir,
      GROUNDWORK_PORT: String(SERVER_PORT),
      GROUNDWORK_DESKTOP: 'true',
      GROUNDWORK_STATIC_DIR: staticDir,
      NODE_PATH: getResourcePath('server', 'node_modules'),
    };

    serverProcess = spawn(process.execPath, [serverEntry], {
      env,
      cwd: getResourcePath('server'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      console.log(`[server] ${msg}`);
      if (msg.includes('running on')) {
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[server:err] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error(`[electron] Failed to start server:`, err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[electron] Server exited with code ${code}`);
      serverProcess = null;
    });

    // Timeout fallback — resolve after 5s even if we didn't see the log
    setTimeout(resolve, 5000);
  });
}

function waitForServer(port: number, retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        socket.destroy();
        retry();
      });
      socket.on('error', () => {
        retry();
      });
      socket.connect(port, '127.0.0.1');
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) {
        reject(new Error(`Server did not start after ${retries} attempts`));
      } else {
        setTimeout(tryConnect, 300);
      }
    };
    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'GroundWork',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function killServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startServer();
      await waitForServer(SERVER_PORT);
      createWindow();
    } catch (err) {
      console.error('[electron] Failed to initialize:', err);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    killServer();
    app.quit();
  });

  app.on('before-quit', () => {
    killServer();
  });
}
