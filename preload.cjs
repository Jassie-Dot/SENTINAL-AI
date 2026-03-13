/**
 * SENTINAL Preload Script
 * Secure bridge between main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

    // App info
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),

    // Setup wizard controls
    retrySetup: () => ipcRenderer.send('setup:retry'),
    skipSetup: () => ipcRenderer.send('setup:skip'),

    // Setup status listener
    onSetupStatus: (callback) => {
        ipcRenderer.on('setup:status', (event, status, progress, message) => {
            callback(status, progress, message);
        });
    },

    // Platform detection
    platform: process.platform,
    isElectron: true
});

// Log that preload is ready
console.log('[PRELOAD] Electron API exposed to renderer');
