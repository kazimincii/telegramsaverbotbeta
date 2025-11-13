const log = require('electron-log');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    this.setupLogger();
  }

  setupLogger() {
    // Configure log levels
    log.transports.file.level = 'info';
    log.transports.console.level = 'debug';

    // Set log file location
    const logPath = path.join(app.getPath('userData'), 'logs');
    log.transports.file.resolvePathFn = () => path.join(logPath, 'main.log');

    // Set log format
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}';

    // Set maximum log file size (10MB)
    log.transports.file.maxSize = 10 * 1024 * 1024;

    // Keep old log files
    log.transports.file.archiveLog = (oldLogFile) => {
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const archivePath = oldLogFile.replace('.log', `_${timestamp}.log`);

      try {
        fs.renameSync(oldLogFile, archivePath);
        this.info(`Log file archived: ${archivePath}`);
      } catch (err) {
        this.error('Failed to archive log file:', err);
      }
    };

    // Log startup info
    this.info('='.repeat(80));
    this.info('Telegram Saver Bot - Application Starting');
    this.info(`Version: ${app.getVersion()}`);
    this.info(`Electron: ${process.versions.electron}`);
    this.info(`Node: ${process.versions.node}`);
    this.info(`Chrome: ${process.versions.chrome}`);
    this.info(`Platform: ${process.platform} ${process.arch}`);
    this.info(`Environment: ${app.isPackaged ? 'Production' : 'Development'}`);
    this.info(`User Data: ${app.getPath('userData')}`);
    this.info(`Logs: ${logPath}`);
    this.info('='.repeat(80));
  }

  // Logging methods
  debug(...args) {
    log.debug(...args);
  }

  info(...args) {
    log.info(...args);
  }

  warn(...args) {
    log.warn(...args);
  }

  error(...args) {
    log.error(...args);
  }

  verbose(...args) {
    log.verbose(...args);
  }

  // Structured logging
  logBackendEvent(action, details = {}) {
    this.info(`[BACKEND] ${action}`, details);
  }

  logFrontendEvent(action, details = {}) {
    this.info(`[FRONTEND] ${action}`, details);
  }

  logDownloadEvent(action, details = {}) {
    this.info(`[DOWNLOAD] ${action}`, details);
  }

  logUserAction(action, details = {}) {
    this.info(`[USER] ${action}`, details);
  }

  logSystemEvent(action, details = {}) {
    this.info(`[SYSTEM] ${action}`, details);
  }

  logPerformance(operation, duration, details = {}) {
    this.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, details);
  }

  // Get log file path
  getLogPath() {
    return log.transports.file.getFile().path;
  }

  // Get all log files
  getLogFiles() {
    const fs = require('fs');
    const logDir = path.dirname(this.getLogPath());

    try {
      const files = fs.readdirSync(logDir);
      return files
        .filter(f => f.endsWith('.log'))
        .map(f => path.join(logDir, f))
        .map(filepath => ({
          path: filepath,
          size: fs.statSync(filepath).size,
          modified: fs.statSync(filepath).mtime
        }))
        .sort((a, b) => b.modified - a.modified);
    } catch (err) {
      this.error('Failed to read log files:', err);
      return [];
    }
  }

  // Clean old log files
  cleanOldLogs(daysToKeep = 7) {
    const fs = require('fs');
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    const logFiles = this.getLogFiles();
    let deletedCount = 0;

    logFiles.forEach(file => {
      const age = now - file.modified.getTime();

      if (age > maxAge) {
        try {
          fs.unlinkSync(file.path);
          deletedCount++;
          this.info(`Deleted old log file: ${file.path}`);
        } catch (err) {
          this.error(`Failed to delete log file: ${file.path}`, err);
        }
      }
    });

    if (deletedCount > 0) {
      this.info(`Cleaned up ${deletedCount} old log file(s)`);
    }
  }

  // Export logs for debugging
  exportLogs() {
    const { dialog } = require('electron');
    const fs = require('fs');

    return dialog.showSaveDialog({
      title: 'Export Logs',
      defaultPath: `telegram-saver-logs-${Date.now()}.zip`,
      filters: [
        { name: 'ZIP Archive', extensions: ['zip'] }
      ]
    }).then(result => {
      if (!result.canceled) {
        // TODO: Implement ZIP creation
        // For now, just copy the current log file
        const currentLog = this.getLogPath();
        fs.copyFileSync(currentLog, result.filePath.replace('.zip', '.log'));
        this.info(`Logs exported to: ${result.filePath}`);
        return result.filePath;
      }
      return null;
    });
  }
}

// Export singleton instance
module.exports = new Logger();
