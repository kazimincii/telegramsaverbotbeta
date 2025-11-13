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

  // Keyboard shortcuts operations
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('update-shortcuts', shortcuts),
  resetShortcuts: () => ipcRenderer.invoke('reset-shortcuts'),

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
  onShortcutAction: (callback) => {
    ipcRenderer.on('shortcut-action', (event, action) => callback(action));
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
  },
  removeShortcutActionListener: () => {
    ipcRenderer.removeAllListeners('shortcut-action');
  }
});

// Log that preload script has been loaded
console.log('Preload script loaded');
