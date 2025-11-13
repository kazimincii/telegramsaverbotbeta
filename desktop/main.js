const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const logger = require('./logger');
const CrashReporter = require('./crash-reporter');
const analytics = require('./analytics');
const { createDevMenu } = require('./dev-menu');

let mainWindow;
let backendProcess;
let tray = null;
let isQuitting = false;

// Initialize crash reporter
const crashReporter = new CrashReporter();
crashReporter.setupProcessHandlers();

// Clean old logs on startup
logger.cleanOldLogs(7); // Keep logs for 7 days

// Configuration
const CONFIG = {
  backendPort: 8000,
  frontendPort: 3000,
  isDev: !app.isPackaged,
  backendPath: app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'main.py')
    : path.join(__dirname, '../backend/main.py'),
  frontendPath: app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'build', 'index.html')
    : path.join(__dirname, '../frontend/build/index.html'),
  pythonCommand: process.platform === 'win32' ? 'python' : 'python3'
};

logger.info('Telegram Saver Bot - Starting...');
logger.info('Environment:', CONFIG.isDev ? 'Development' : 'Production');
logger.info('Backend Path:', CONFIG.backendPath);

// Check if backend is running
function checkBackend(callback) {
  const options = {
    host: 'localhost',
    port: CONFIG.backendPort,
    path: '/api/status',
    timeout: 5000 // Increased from 2000 for slower systems
  };

  const req = http.get(options, (res) => {
    callback(true);
  });

  req.on('error', () => callback(false));
  req.on('timeout', () => {
    req.destroy();
    callback(false);
  });
}

// Start Python backend
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('Starting Python backend...');

    // Check if backend is already running
    checkBackend((isRunning) => {
      if (isRunning) {
        console.log('Backend already running on port', CONFIG.backendPort);
        resolve();
        return;
      }

      // Check if Python is installed
      const pythonCheck = spawn(CONFIG.pythonCommand, ['--version']);
      pythonCheck.on('error', () => {
        dialog.showErrorBox(
          'Python Not Found',
          'Python is required to run Telegram Saver Bot.\n\n' +
          'Please install Python 3.8+ from:\n' +
          'https://www.python.org/downloads/'
        );
        reject(new Error('Python not found'));
      });

      pythonCheck.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Python check failed'));
          return;
        }

        // Start backend process
        backendProcess = spawn(CONFIG.pythonCommand, [
          CONFIG.backendPath
        ], {
          cwd: path.join(__dirname, '../backend'),
          env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });

        backendProcess.stdout.on('data', (data) => {
          const message = data.toString().trim();
          console.log('[Backend]', message);

          // Check if backend is ready
          if (message.includes('Uvicorn running') || message.includes('Application startup complete')) {
            setTimeout(() => {
              checkBackend((isRunning) => {
                if (isRunning) {
                  console.log('Backend started successfully!');
                  resolve();
                } else {
                  console.log('Backend not responding, waiting...');
                  setTimeout(() => resolve(), 2000);
                }
              });
            }, 1000);
          }
        });

        backendProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          if (!message.includes('WARNING') && !message.includes('INFO')) {
            console.error('[Backend Error]', message);
          }
        });

        backendProcess.on('error', (error) => {
          console.error('Backend process error:', error);
          reject(error);
        });

        backendProcess.on('close', (code) => {
          console.log('Backend process exited with code:', code);
          if (code !== 0 && !isQuitting) {
            dialog.showErrorBox(
              'Backend Crashed',
              `Backend process exited with code ${code}.\n\n` +
              'The application will continue to run, but features may not work.\n\n' +
              'Please check the logs for more information.'
            );
          }
        });
      });
    });
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'resources', 'icon.png');

  // Create a simple icon if it doesn't exist
  if (!fs.existsSync(iconPath)) {
    logger.warn('Tray icon not found at:', iconPath);
    // Try to use a fallback or skip tray creation
    return;
  }

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Start Download',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('action', 'start-download');
        }
      }
    },
    {
      label: 'Stop Download',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('action', 'stop-download');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Analytics',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', 'analytics');
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', 'settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Telegram Saver Bot');
  tray.setContextMenu(contextMenu);

  // Show window on click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Create main window
function createWindow() {
  console.log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Telegram Saver Bot',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until ready
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load appropriate URL
  const startUrl = CONFIG.isDev
    ? `http://localhost:${CONFIG.frontendPort}`
    : `file://${CONFIG.frontendPath}`;

  console.log('Loading URL:', startUrl);

  mainWindow.loadURL(startUrl).catch((err) => {
    console.error('Failed to load URL:', err);

    // Show error page
    mainWindow.loadURL(`data:text/html,
      <html>
        <head>
          <title>Loading Error</title>
          <style>
            body {
              background: #1a1a2e;
              color: #fff;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .error-container {
              text-align: center;
              max-width: 600px;
              padding: 40px;
            }
            h1 { color: #f44336; }
            .info { background: #2a2a3e; padding: 20px; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️ Failed to Load Application</h1>
            <p>The frontend could not be loaded.</p>
            <div class="info">
              <p><strong>URL:</strong> ${startUrl}</p>
              <p><strong>Error:</strong> ${err.message}</p>
              ${CONFIG.isDev ?
                '<p><strong>Solution:</strong> Make sure frontend is running:<br><code>cd frontend && npm start</code></p>' :
                '<p><strong>Solution:</strong> Make sure to build the frontend first:<br><code>cd frontend && npm run build</code></p>'
              }
            </div>
          </div>
        </body>
      </html>
    `);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();

    if (CONFIG.isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App events
app.on('ready', async () => {
  console.log('App ready, starting backend...');

  // Track app start
  analytics.trackAppStart();

  try {
    await startBackend();
    console.log('Backend started, creating window...');
    createWindow();
    createTray();

    // Create dev menu (in development mode)
    if (CONFIG.isDev) {
      createDevMenu(mainWindow, crashReporter);
    }

    console.log('Application started successfully!');
  } catch (error) {
    console.error('Failed to start application:', error);
    analytics.trackError(error, { phase: 'startup' });
    dialog.showErrorBox(
      'Startup Failed',
      'Failed to start the application.\n\n' +
      error.message
    );
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Track app quit
  analytics.trackAppQuit();

  // Kill backend process
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (backendProcess) {
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    isDev: CONFIG.isDev,
    platform: process.platform,
    backendUrl: `http://localhost:${CONFIG.backendPort}`
  };
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  shell.showItemInFolder(folderPath);
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('restart-backend', async () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
  await startBackend();

  return { success: true };
});

// Auto-updater configuration
autoUpdater.logger = logger;
autoUpdater.autoDownload = false; // Don't auto-download, ask user first

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  logger.info('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  logger.info('Update available:', info.version);

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Do you want to download it now?`,
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();

      // Show download progress
      let progressWin = new BrowserWindow({
        width: 400,
        height: 150,
        parent: mainWindow,
        modal: true,
        show: false,
        frame: false,
        resizable: false
      });

      progressWin.loadURL(`data:text/html,
        <html>
          <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h3>Downloading Update...</h3>
            <progress id="progress" value="0" max="100" style="width: 300px;"></progress>
            <p id="status">0%</p>
          </body>
        </html>
      `);

      progressWin.once('ready-to-show', () => {
        progressWin.show();
      });

      autoUpdater.on('download-progress', (progressObj) => {
        logger.info('Download progress:', progressObj.percent);
        progressWin.webContents.executeJavaScript(`
          document.getElementById('progress').value = ${progressObj.percent};
          document.getElementById('status').textContent = '${Math.round(progressObj.percent)}%';
        `);
      });

      autoUpdater.on('update-downloaded', () => {
        progressWin.close();
      });
    }
  });
});

autoUpdater.on('update-not-available', () => {
  logger.info('No updates available');
});

autoUpdater.on('error', (err) => {
  logger.error('Auto-updater error:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  logger.info(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  logger.info('Update downloaded:', info.version);

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update has been downloaded. Restart the application to apply the update?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

// Check for updates on startup (in production only)
app.on('ready', () => {
  if (!CONFIG.isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000); // Check after 5 seconds
  }
});

// IPC handler for manual update check
ipcMain.handle('check-for-updates', async () => {
  if (CONFIG.isDev) {
    return { available: false, message: 'Updates are disabled in development mode' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: true, version: result.updateInfo.version };
  } catch (error) {
    logger.error('Manual update check failed:', error);
    return { available: false, error: error.message };
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  dialog.showErrorBox(
    'Application Error',
    'An unexpected error occurred:\n\n' + error.message
  );
});

logger.info('Main process initialized');
