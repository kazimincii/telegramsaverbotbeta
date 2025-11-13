/**
 * Offline Storage Manager using IndexedDB
 * Stores download queue, media metadata, and thumbnails for offline access
 */

const DB_NAME = 'TelegramSaverOffline';
const DB_VERSION = 1;

// Object stores
const STORES = {
  DOWNLOADS: 'downloads',
  MEDIA: 'media',
  THUMBNAILS: 'thumbnails',
  QUEUE: 'queue',
  SETTINGS: 'settings'
};

class OfflineStorage {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.isInitialized) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Downloads store - completed downloads
        if (!db.objectStoreNames.contains(STORES.DOWNLOADS)) {
          const downloadsStore = db.createObjectStore(STORES.DOWNLOADS, { keyPath: 'id', autoIncrement: true });
          downloadsStore.createIndex('chatId', 'chatId', { unique: false });
          downloadsStore.createIndex('timestamp', 'timestamp', { unique: false });
          downloadsStore.createIndex('fileType', 'fileType', { unique: false });
        }

        // Media store - media metadata
        if (!db.objectStoreNames.contains(STORES.MEDIA)) {
          const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
          mediaStore.createIndex('chatId', 'chatId', { unique: false });
          mediaStore.createIndex('messageId', 'messageId', { unique: false });
          mediaStore.createIndex('fileName', 'fileName', { unique: false });
        }

        // Thumbnails store - cached thumbnails
        if (!db.objectStoreNames.contains(STORES.THUMBNAILS)) {
          const thumbnailsStore = db.createObjectStore(STORES.THUMBNAILS, { keyPath: 'id' });
          thumbnailsStore.createIndex('mediaId', 'mediaId', { unique: true });
        }

        // Queue store - download queue (pending downloads)
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('priority', 'priority', { unique: false });
        }

        // Settings store - offline settings
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  /**
   * Add download record
   */
  async addDownload(download) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.DOWNLOADS], 'readwrite');
      const store = transaction.objectStore(STORES.DOWNLOADS);
      const request = store.add({
        ...download,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all downloads
   */
  async getDownloads(filters = {}) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.DOWNLOADS], 'readonly');
      const store = transaction.objectStore(STORES.DOWNLOADS);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result;

        // Apply filters
        if (filters.chatId) {
          results = results.filter(d => d.chatId === filters.chatId);
        }
        if (filters.fileType) {
          results = results.filter(d => d.fileType === filters.fileType);
        }
        if (filters.startDate) {
          results = results.filter(d => d.timestamp >= filters.startDate);
        }
        if (filters.endDate) {
          results = results.filter(d => d.timestamp <= filters.endDate);
        }

        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add media metadata
   */
  async addMedia(media) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MEDIA], 'readwrite');
      const store = transaction.objectStore(STORES.MEDIA);
      const request = store.put(media);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get media by ID
   */
  async getMedia(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MEDIA], 'readonly');
      const store = transaction.objectStore(STORES.MEDIA);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add thumbnail
   */
  async addThumbnail(mediaId, blob) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.THUMBNAILS], 'readwrite');
      const store = transaction.objectStore(STORES.THUMBNAILS);
      const request = store.put({
        id: `thumb_${mediaId}`,
        mediaId,
        blob,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get thumbnail
   */
  async getThumbnail(mediaId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.THUMBNAILS], 'readonly');
      const store = transaction.objectStore(STORES.THUMBNAILS);
      const index = store.index('mediaId');
      const request = index.get(mediaId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add to download queue
   */
  async addToQueue(item) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.add({
        ...item,
        status: item.status || 'pending',
        priority: item.priority || 0,
        addedAt: Date.now()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get queue items
   */
  async getQueue(status = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.QUEUE);

      if (status) {
        const index = store.index('status');
        const request = index.getAll(status);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  /**
   * Update queue item status
   */
  async updateQueueStatus(id, status) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          item.updatedAt = Date.now();
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Queue item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove from queue
   */
  async removeFromQueue(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    await this.init();
    const stores = Object.values(STORES);
    const transaction = this.db.transaction(stores, 'readwrite');

    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  /**
   * Get storage stats
   */
  async getStats() {
    await this.init();

    const stats = {};

    for (const [key, storeName] of Object.entries(STORES)) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();

      stats[key] = await new Promise((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
      });
    }

    return stats;
  }
}

// Export singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;
