/**
 * ====================================
 * SENTINAL DESKTOP APPLICATION
 * ====================================
 * Electron Main Process
 */

'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Constants
const CONFIG = {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    serverPort: 3000
};

// State
let mainWindow = null;
let setupWindow = null;
let tray = null;
let isQuitting = false;

// Force Electron (Chromium) to allow microphone and speech API BEFORE anything loads
app.commandLine.appendSwitch('enable-speech-dispatcher');
if (process.env.SENTINAL_DEV === '1') {
    // Dev-only escape hatches; keep production strict.
    app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
    app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
}

// Helpers
const getSetupStateFile = () => path.join(app.getPath('userData'), 'setup-complete.json');

function isSetupComplete() {
    try {
        if (fs.existsSync(getSetupStateFile())) {
            const data = JSON.parse(fs.readFileSync(getSetupStateFile(), 'utf8'));
            return data.complete === true;
        }
    } catch (e) { return false; }
    return false;
}

function markSetupComplete(useCloudAI = false) {
    try {
        fs.writeFileSync(getSetupStateFile(), JSON.stringify({
            complete: true,
            timestamp: new Date().toISOString(),
            useCloudAI
        }));
    } catch (e) { }
}

/* ===================== WINDOW MANAGEMENT ===================== */

function createSetupWindow() {
    setupWindow = new BrowserWindow({
        width: 600,
        height: 500,
        frame: false,
        backgroundColor: '#0a0a0a',
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        show: false
    });

    setupWindow.loadFile(path.join(__dirname, 'public', 'setup.html'));
    setupWindow.once('ready-to-show', () => {
        setupWindow.show();
        runSetupLogic();
    });
}

async function runSetupLogic() {
    try {
        const { default: SetupWizard } = await import('./setup/setup-wizard.mjs');
        const wizard = new SetupWizard();
        const success = await wizard.runSetup((status, progress, message) => {
            if (setupWindow && !setupWindow.isDestroyed()) {
                setupWindow.webContents.send('setup:status', status, progress, message);
            }
        });

        if (success) {
            markSetupComplete(false);
            setTimeout(async () => {
                if (setupWindow) setupWindow.close();
                await launchMainApp();
            }, 2000);
        }
    } catch (err) {
        console.error('[SETUP] Error:', err);
    }
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: CONFIG.width,
        height: CONFIG.height,
        minWidth: CONFIG.minWidth,
        minHeight: CONFIG.minHeight,
        frame: false,
        backgroundColor: '#000000',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            enableBlinkFeatures: 'SpeechRecognition',
            preload: path.join(__dirname, 'preload.cjs')
        },
        show: false
    });

    mainWindow.loadURL(`http://localhost:${CONFIG.serverPort}`);

    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();

    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show SENTINAL', click: () => { mainWindow.show(); mainWindow.focus(); } },
        { type: 'separator' },
        { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('S.E.N.T.I.N.E.L. Mark IV');
    tray.setContextMenu(contextMenu);
}

/* ===================== IPC HANDLERS ===================== */

function setupIPC() {
    ipcMain.on('window:minimize', () => mainWindow?.minimize());
    ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
    ipcMain.on('window:close', () => mainWindow?.hide());
    ipcMain.on('setup:skip', async () => {
        markSetupComplete(true);
        if (setupWindow) setupWindow.close();
        await launchMainApp();
    });
}

/* ===================== BOOTSTRAP ===================== */

async function launchMainApp() {
    try {
        const { startServer } = await import('./server.mjs');
        const port = await startServer();
        CONFIG.serverPort = port; // Update config with actual port
        createMainWindow();
        createTray();
    } catch (err) {
        console.error('[BOOT] Failed to start server:', err);
        app.quit();
    }
}


app.whenReady().then(async () => {
    // Check environment
    if (process.env.ELECTRON_RUN_AS_NODE) {
        console.error('\n[FATAL] ELECTRON_RUN_AS_NODE is set. This process cannot run as an Electron app.');
        console.error('Please unset this environment variable and try again.\n');
        app.quit();
        return;
    }

    // Grant Microphone and Speech API Permissions automatically
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
        const allowedPermissions = ['media', 'mediaKeySystem', 'microphone'];
        if (allowedPermissions.includes(permission)) {
            return callback(true);
        }
        callback(false);
    });

    session.defaultSession.setPermissionCheckHandler((wc, permission) => {
        const allowedPermissions = ['media', 'mediaKeySystem', 'microphone'];
        return allowedPermissions.includes(permission);
    });

    setupIPC();

    if (!isSetupComplete()) {
        const { default: SetupWizard } = await import('./setup/setup-wizard.mjs');
        const wizard = new SetupWizard();
        if (await wizard.isSetupNeeded()) {
            createSetupWindow();
        } else {
            markSetupComplete(false);
            await launchMainApp();
        }
    } else {
        await launchMainApp();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
