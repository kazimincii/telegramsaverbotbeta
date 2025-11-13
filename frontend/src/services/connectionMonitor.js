/**
 * Connection Monitor Service
 * Monitors online/offline status and manages sync queue
 */

class ConnectionMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.syncQueue = [];
    this.autoSyncEnabled = true;
    this.lastOnlineTime = Date.now();
    this.lastOfflineTime = null;
  }

  /**
   * Initialize connection monitoring
   */
  init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Periodic connectivity check (every 30 seconds)
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);

    console.log('Connection monitor initialized. Status:', this.isOnline ? 'Online' : 'Offline');
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Connection restored');
    this.isOnline = true;
    this.lastOnlineTime = Date.now();
    this.lastOfflineTime = null;

    // Notify listeners
    this.notifyListeners('online');

    // Auto-sync if enabled
    if (this.autoSyncEnabled) {
      this.processSyncQueue();
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Connection lost');
    this.isOnline = false;
    this.lastOfflineTime = Date.now();

    // Notify listeners
    this.notifyListeners('offline');
  }

  /**
   * Check connection status manually
   */
  async checkConnection() {
    const wasOnline = this.isOnline;

    try {
      // Try to fetch a small resource to verify connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/ping', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      this.isOnline = response.ok;
    } catch (error) {
      this.isOnline = false;
    }

    // Trigger events if status changed
    if (wasOnline && !this.isOnline) {
      this.handleOffline();
    } else if (!wasOnline && this.isOnline) {
      this.handleOnline();
    }

    return this.isOnline;
  }

  /**
   * Add listener for connection status changes
   */
  addListener(callback) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.isOnline);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Add item to sync queue
   */
  addToSyncQueue(item) {
    this.syncQueue.push({
      ...item,
      addedAt: Date.now(),
      attempts: 0
    });
    console.log(`Added to sync queue: ${item.type}`, item);
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    console.log(`Processing sync queue: ${this.syncQueue.length} items`);

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        await this.syncItem(item);
        console.log('Synced:', item.type);
      } catch (error) {
        console.error('Sync failed:', item.type, error);

        // Re-add to queue if not too many attempts
        if (item.attempts < 3) {
          this.syncQueue.push({
            ...item,
            attempts: item.attempts + 1
          });
        }
      }
    }
  }

  /**
   * Sync individual item
   */
  async syncItem(item) {
    switch (item.type) {
      case 'download':
        // Sync download to server/cloud
        if (item.callback) {
          await item.callback(item.data);
        }
        break;

      case 'settings':
        // Sync settings
        if (item.callback) {
          await item.callback(item.data);
        }
        break;

      case 'metadata':
        // Sync metadata
        if (item.callback) {
          await item.callback(item.data);
        }
        break;

      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      isOnline: this.isOnline,
      lastOnlineTime: this.lastOnlineTime,
      lastOfflineTime: this.lastOfflineTime,
      queueLength: this.syncQueue.length,
      autoSyncEnabled: this.autoSyncEnabled
    };
  }

  /**
   * Enable/disable auto-sync
   */
  setAutoSync(enabled) {
    this.autoSyncEnabled = enabled;
    console.log('Auto-sync:', enabled ? 'enabled' : 'disabled');

    if (enabled && this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue() {
    const count = this.syncQueue.length;
    this.syncQueue = [];
    console.log(`Cleared sync queue: ${count} items removed`);
    return count;
  }

  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.listeners = [];
    console.log('Connection monitor destroyed');
  }
}

// Export singleton instance
const connectionMonitor = new ConnectionMonitor();
export default connectionMonitor;
