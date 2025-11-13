const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;
let tray = null;
let isQuitting = false;

// Configuration
const CONFIG = {
  backendPort: 8000,
  frontendPort: 3000,
  isDev: !app.isPackaged,
  backendPath: path.join(__dirname, '../backend/main.py'),
  frontendPath: path.join(__dirname, '../frontend/build/index.html'),
  pythonCommand: process.platform === 'win32' ? 'python' : 'python3'
};

console.log('Telegram Saver Bot - Starting...');
console.log('Environment:', CONFIG.isDev ? 'Development' : 'Production');
console.log('Backend Path:', CONFIG.backendPath);

// Check if backend is running
function checkBackend(callback) {
  const options = {
    host: 'localhost',
    port: CONFIG.backendPort,
    path: '/api/status',
    timeout: 2000
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
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  // Create a simple icon if it doesn't exist
  if (!fs.existsSync(iconPath)) {
    fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
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

  try {
    await startBackend();
    console.log('Backend started, creating window...');
    createWindow();
    createTray();
    console.log('Application started successfully!');
  } catch (error) {
    console.error('Failed to start application:', error);
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox(
    'Application Error',
    'An unexpected error occurred:\n\n' + error.message
  );
});

console.log('Main process initialized');
