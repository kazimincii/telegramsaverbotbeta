const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

class CrashReporter {
  constructor() {
    this.crashLogDir = path.join(app.getPath('userData'), 'crash-logs');
    this.ensureCrashLogDir();
  }

  ensureCrashLogDir() {
    if (!fs.existsSync(this.crashLogDir)) {
      fs.mkdirSync(this.crashLogDir, { recursive: true });
    }
  }

  generateCrashReport(error, context = {}) {
    const timestamp = new Date().toISOString();
    const crashId = `crash-${Date.now()}`;

    const report = {
      crashId,
      timestamp,
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      systemInfo: {
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        cpus: require('os').cpus().length,
        uptime: process.uptime()
      }
    };

    return report;
  }

  saveCrashReport(report) {
    const filename = `${report.crashId}.json`;
    const filepath = path.join(this.crashLogDir, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      log.error(`Crash report saved: ${filepath}`);
      return filepath;
    } catch (err) {
      log.error('Failed to save crash report:', err);
      return null;
    }
  }

  handleCrash(error, context = {}) {
    log.error('Application crash:', error);

    const report = this.generateCrashReport(error, context);
    const filepath = this.saveCrashReport(report);

    // You can send this to a remote server for tracking
    // this.sendToServer(report);

    return {
      report,
      filepath
    };
  }

  async sendToServer(report) {
    // TODO: Implement remote crash reporting
    // Example: Send to your own server or third-party service

    /*
    try {
      const response = await fetch('https://your-crash-server.com/api/crashes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });

      if (response.ok) {
        log.info('Crash report sent to server');
      }
    } catch (err) {
      log.error('Failed to send crash report to server:', err);
    }
    */
  }

  getCrashReports() {
    try {
      const files = fs.readdirSync(this.crashLogDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(this.crashLogDir, f));
    } catch (err) {
      log.error('Failed to read crash reports:', err);
      return [];
    }
  }

  cleanOldCrashReports(daysToKeep = 7) {
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    const reports = this.getCrashReports();
    reports.forEach(filepath => {
      try {
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filepath);
          log.info(`Deleted old crash report: ${filepath}`);
        }
      } catch (err) {
        log.error('Failed to delete old crash report:', err);
      }
    });
  }

  setupProcessHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleCrash(error, { type: 'uncaughtException' });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = new Error(`Unhandled Rejection: ${reason}`);
      this.handleCrash(error, {
        type: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    // Handle renderer process crashes
    app.on('render-process-gone', (event, webContents, details) => {
      const error = new Error('Renderer process crashed');
      this.handleCrash(error, {
        type: 'render-process-gone',
        reason: details.reason,
        exitCode: details.exitCode
      });
    });

    // Clean old crash reports on startup
    this.cleanOldCrashReports();
  }
}

module.exports = CrashReporter;
