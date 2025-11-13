const { Menu, shell, dialog } = require('electron');
const logger = require('./logger');
const analytics = require('./analytics');

function createDevMenu(mainWindow, crashReporter) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Logs Folder',
          click: () => {
            const logPath = logger.getLogPath();
            const path = require('path');
            shell.showItemInFolder(logPath);
          }
        },
        {
          label: 'Export Logs',
          click: async () => {
            try {
              const result = await logger.exportLogs();
              if (result) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Logs Exported',
                  message: `Logs have been exported to:\n${result}`
                });
              }
            } catch (err) {
              logger.error('Failed to export logs:', err);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open User Data Folder',
          click: () => {
            const { app } = require('electron');
            shell.openPath(app.getPath('userData'));
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            const { app } = require('electron');
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'View Crash Reports',
          click: () => {
            const crashes = crashReporter.getCrashReports();
            if (crashes.length === 0) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'No Crash Reports',
                message: 'No crash reports found.'
              });
            } else {
              const crashList = crashes.map((c, i) => `${i + 1}. ${c}`).join('\n');
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Crash Reports',
                message: `Found ${crashes.length} crash report(s):\n\n${crashList}`,
                buttons: ['Open Folder', 'OK']
              }).then(result => {
                if (result.response === 0) {
                  shell.showItemInFolder(crashes[0]);
                }
              });
            }
          }
        },
        {
          label: 'View Analytics',
          click: () => {
            const summary = analytics.getSummary();
            const duration = Math.round(summary.sessionDuration / 1000 / 60);
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Analytics Summary',
              message: `Session Duration: ${duration} minutes\nTotal Events: ${summary.totalEvents}\nPlatform: ${summary.platform}\nVersion: ${summary.appVersion}`
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Trigger Test Crash',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: 'Test Crash',
              message: 'This will trigger a test crash. Continue?',
              buttons: ['Yes', 'No']
            }).then(result => {
              if (result.response === 0) {
                throw new Error('Test crash triggered from dev menu');
              }
            });
          }
        },
        {
          label: 'Clear Analytics Data',
          click: () => {
            analytics.clearData();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Analytics Cleared',
              message: 'All analytics data has been cleared.'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Clean Old Logs',
          click: () => {
            logger.cleanOldLogs(7);
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Logs Cleaned',
              message: 'Old log files have been cleaned up.'
            });
          }
        },
        {
          label: 'Clean Old Crash Reports',
          click: () => {
            crashReporter.cleanOldCrashReports(7);
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Crash Reports Cleaned',
              message: 'Old crash reports have been cleaned up.'
            });
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const path = require('path');
            const fs = require('fs');
            const readmePath = path.join(__dirname, '../README.md');

            if (fs.existsSync(readmePath)) {
              shell.openPath(readmePath);
            } else {
              await shell.openExternal('https://github.com/kazimincii/telegramsaverbotbeta');
            }
          }
        },
        {
          label: 'Desktop App Guide',
          click: () => {
            const path = require('path');
            const fs = require('fs');
            const guidePath = path.join(__dirname, '../DESKTOP_APP_GUIDE.md');

            if (fs.existsSync(guidePath)) {
              shell.openPath(guidePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: async () => {
            const { checkForUpdates } = require('./main');
            if (checkForUpdates) {
              await checkForUpdates();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Report an Issue',
          click: async () => {
            await shell.openExternal('https://github.com/kazimincii/telegramsaverbotbeta/issues');
          }
        },
        {
          label: 'About',
          click: () => {
            const { app } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Telegram Saver',
              message: `Telegram Saver Bot\n\nVersion: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}\n\nCopyright © 2025 Telegram Saver Team`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  logger.info('[DEV-MENU] Application menu created');
}

module.exports = { createDevMenu };
