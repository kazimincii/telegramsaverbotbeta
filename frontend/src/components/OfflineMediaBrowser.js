import React, { useState, useEffect } from 'react';
import offlineStorage from '../services/offlineStorage';

export default function OfflineMediaBrowser() {
  const [downloads, setDownloads] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDownload, setSelectedDownload] = useState(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [downloadList, storageStats] = await Promise.all([
        offlineStorage.getDownloads(filters),
        offlineStorage.getStats()
      ]);

      setDownloads(downloadList.sort((a, b) => b.timestamp - a.timestamp));
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all offline data?')) {
      return;
    }

    try {
      await offlineStorage.clearAll();
      await loadData();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="offline-media-browser">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📦 Offline Media Browser</h3>
          <div className="card-description">
            Browse your downloaded media and cached data
          </div>
        </div>

        <div className="card-body">
          {/* Statistics */}
          {stats && (
            <div className="offline-stats">
              <div className="offline-stat-item">
                <div className="offline-stat-icon">📥</div>
                <div className="offline-stat-content">
                  <div className="offline-stat-value">{stats.DOWNLOADS || 0}</div>
                  <div className="offline-stat-label">Downloads</div>
                </div>
              </div>

              <div className="offline-stat-item">
                <div className="offline-stat-icon">🖼️</div>
                <div className="offline-stat-content">
                  <div className="offline-stat-value">{stats.MEDIA || 0}</div>
                  <div className="offline-stat-label">Media Files</div>
                </div>
              </div>

              <div className="offline-stat-item">
                <div className="offline-stat-icon">🎨</div>
                <div className="offline-stat-content">
                  <div className="offline-stat-value">{stats.THUMBNAILS || 0}</div>
                  <div className="offline-stat-label">Thumbnails</div>
                </div>
              </div>

              <div className="offline-stat-item">
                <div className="offline-stat-icon">⏳</div>
                <div className="offline-stat-content">
                  <div className="offline-stat-value">{stats.QUEUE || 0}</div>
                  <div className="offline-stat-label">Queue</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="offline-actions-bar">
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              disabled={loading}
            >
              🔄 Refresh
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleClearAll}
              disabled={loading}
            >
              🗑️ Clear All Data
            </button>
          </div>

          {/* Downloads List */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading offline data...</div>
            </div>
          ) : downloads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No Offline Data</div>
              <div className="empty-state-description">
                Download some media to see it here
              </div>
            </div>
          ) : (
            <div className="offline-downloads-list">
              {downloads.map((download) => (
                <div
                  key={download.id}
                  className={`offline-download-item ${selectedDownload?.id === download.id ? 'active' : ''}`}
                  onClick={() => setSelectedDownload(download)}
                >
                  <div className="offline-download-header">
                    <div className="offline-download-chat">
                      💬 {download.chatId}
                    </div>
                    <div className="offline-download-date">
                      {formatDate(download.timestamp)}
                    </div>
                  </div>

                  <div className="offline-download-stats">
                    <span className="offline-download-stat">
                      📥 {download.fileCount} files
                    </span>
                    {download.skipped > 0 && (
                      <span className="offline-download-stat">
                        ⏭️ {download.skipped} skipped
                      </span>
                    )}
                  </div>

                  <div className="offline-download-details">
                    <span className="offline-download-detail">
                      📁 {download.folder || 'Unknown folder'}
                    </span>
                    {download.types && (
                      <span className="offline-download-detail">
                        🏷️ {Array.isArray(download.types) ? download.types.join(', ') : download.types}
                      </span>
                    )}
                  </div>

                  {selectedDownload?.id === download.id && (
                    <div className="offline-download-expanded">
                      <div className="offline-download-info">
                        <strong>Download ID:</strong> {download.id}
                      </div>
                      <div className="offline-download-info">
                        <strong>Completed:</strong> {formatDate(download.completedAt || download.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> Offline data is stored in your browser's IndexedDB
            and persists across sessions.
          </div>
        </div>
      </div>
    </div>
  );
}
