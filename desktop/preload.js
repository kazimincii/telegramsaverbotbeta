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

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Notification operations
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  notifyDownloadComplete: (stats) => ipcRenderer.invoke('notify-download-complete', stats),
  notifyDownloadError: (error) => ipcRenderer.invoke('notify-download-error', error),
  notifyDownloadProgress: (progress) => ipcRenderer.invoke('notify-download-progress', progress),
  getNotificationSettings: () => ipcRenderer.invoke('get-notification-settings'),
  updateNotificationSettings: (settings) => ipcRenderer.invoke('update-notification-settings', settings),

  // Event listeners
  onAction: (callback) => {
    ipcRenderer.on('action', (event, action) => callback(action));
  },
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (event, path) => callback(path));
  },
  onShowErrors: (callback) => {
    ipcRenderer.on('show-errors', (event) => callback());
  },

  // Remove listeners
  removeActionListener: () => {
    ipcRenderer.removeAllListeners('action');
  },
  removeNavigateListener: () => {
    ipcRenderer.removeAllListeners('navigate');
  },
  removeShowErrorsListener: () => {
    ipcRenderer.removeAllListeners('show-errors');
  }
});

// Log that preload script has been loaded
console.log('Preload script loaded');
