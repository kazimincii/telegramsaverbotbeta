const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const index = path.join(__dirname, '../frontend/build/index.html');
  win.loadFile(index);
}

app.whenReady().then(createWindow);
