const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // File system operations
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Backend operations
  restartBackend: () => ipcRenderer.invoke('restart-backend'),

  // Notifications
  onAction: (callback) => {
    ipcRenderer.on('action', (event, action) => callback(action));
  },
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (event, path) => callback(path));
  },

  // Remove listeners
  removeActionListener: () => {
    ipcRenderer.removeAllListeners('action');
  },
  removeNavigateListener: () => {
    ipcRenderer.removeAllListeners('navigate');
  }
});

// Log that preload script has been loaded
console.log('Preload script loaded');
