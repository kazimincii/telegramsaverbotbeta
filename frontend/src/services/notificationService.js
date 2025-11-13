/**
 * Notification Service
 *
 * Provides a unified interface for showing notifications
 * Uses Electron notifications when available, falls back to browser notifications
 */

class NotificationService {
  constructor() {
    this.isElectron = window.electronAPI !== undefined;
    this.settings = {
      enabled: true,
      sound: true,
      downloadComplete: true,
      downloadError: true,
      downloadProgress: true
    };

    // Load settings from electron if available
    if (this.isElectron) {
      this.loadSettings();
    }
  }

  async loadSettings() {
    try {
      const settings = await window.electronAPI.getNotificationSettings();
      this.settings = { ...this.settings, ...settings };
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    if (this.isElectron) {
      try {
        await window.electronAPI.updateNotificationSettings(this.settings);
      } catch (error) {
        console.error('Failed to update notification settings:', error);
      }
    } else {
      // Save to localStorage for browser
      localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }
  }

  /**
   * Show a generic notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body
   * @param {string} [options.urgency] - Urgency level (low, normal, critical)
   * @param {boolean} [options.silent] - Silent notification (no sound)
   * @param {Array} [options.actions] - Action buttons
   * @param {Function} [options.onClick] - Click handler
   */
  async show(options) {
    if (!this.settings.enabled) {
      return null;
    }

    if (this.isElectron) {
      try {
        return await window.electronAPI.showNotification(options);
      } catch (error) {
        console.error('Failed to show electron notification:', error);
        return this.showBrowserNotification(options);
      }
    } else {
      return this.showBrowserNotification(options);
    }
  }

  /**
   * Show browser notification (fallback)
   */
  async showBrowserNotification(options) {
    // Request permission if needed
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      silent: options.silent || false
    });

    if (options.onClick) {
      notification.onclick = options.onClick;
    }

    return notification;
  }

  /**
   * Notify download complete
   * @param {Object} stats - Download statistics
   * @param {number} stats.count - Number of files downloaded
   * @param {string} stats.chat - Chat name
   * @param {string} [stats.folder] - Download folder path
   */
  async notifyDownloadComplete(stats) {
    if (!this.settings.downloadComplete) {
      return;
    }

    if (this.isElectron) {
      try {
        return await window.electronAPI.notifyDownloadComplete(stats);
      } catch (error) {
        console.error('Failed to show download complete notification:', error);
      }
    }

    return this.show({
      title: '✅ Download Complete',
      body: `Downloaded ${stats.count || 0} files from "${stats.chat || 'Unknown'}"`,
      onClick: () => {
        window.focus();
      }
    });
  }

  /**
   * Notify download error
   * @param {Object} error - Error object
   * @param {string} error.message - Error message
   */
  async notifyDownloadError(error) {
    if (!this.settings.downloadError) {
      return;
    }

    if (this.isElectron) {
      try {
        return await window.electronAPI.notifyDownloadError(error);
      } catch (err) {
        console.error('Failed to show download error notification:', err);
      }
    }

    return this.show({
      title: '❌ Download Error',
      body: error.message || 'An error occurred during download',
      urgency: 'critical',
      onClick: () => {
        window.focus();
      }
    });
  }

  /**
   * Notify download progress (throttled)
   * @param {Object} progress - Progress object
   * @param {number} progress.downloaded - Files downloaded
   * @param {string} progress.chat - Current chat name
   */
  async notifyDownloadProgress(progress) {
    if (!this.settings.downloadProgress) {
      return;
    }

    if (this.isElectron) {
      try {
        return await window.electronAPI.notifyDownloadProgress(progress);
      } catch (error) {
        console.error('Failed to show download progress notification:', error);
      }
    }

    // For browser, don't show progress notifications (too many)
    return null;
  }

  /**
   * Notify generic info
   */
  async notifyInfo(title, message) {
    return this.show({
      title: `ℹ️ ${title}`,
      body: message,
      urgency: 'normal'
    });
  }

  /**
   * Notify generic warning
   */
  async notifyWarning(title, message) {
    return this.show({
      title: `⚠️ ${title}`,
      body: message,
      urgency: 'normal'
    });
  }

  /**
   * Notify generic success
   */
  async notifySuccess(title, message) {
    return this.show({
      title: `✅ ${title}`,
      body: message,
      urgency: 'normal'
    });
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Check if notifications are supported
   */
  isSupported() {
    return this.isElectron || ('Notification' in window);
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
