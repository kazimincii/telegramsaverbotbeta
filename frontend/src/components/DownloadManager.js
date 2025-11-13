/**
 * Advanced Download Manager Component
 * Provides download queue, pause/resume, speed limiting, and monitoring
 */

import React, { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function DownloadManager() {
  const [activeTab, setActiveTab] = useState('active');
  const [downloads, setDownloads] = useState([]);
  const [history, setHistory] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedDownload, setSelectedDownload] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add download form state
  const [newDownload, setNewDownload] = useState({
    url: '',
    destination: './downloads',
    filename: '',
    priority: 'NORMAL',
    speed_limit: null,
    connections: 1,
    checksum: ''
  });

  // Polling interval
  const pollInterval = useRef(null);

  useEffect(() => {
    loadDownloads();
    loadHistory();
    loadStatistics();

    // Start polling for updates
    pollInterval.current = setInterval(() => {
      loadDownloads();
      if (selectedDownload) {
        loadDownloadDetails(selectedDownload.id);
      }
    }, 1000); // Update every second

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [selectedDownload]);

  /**
   * Load all downloads
   */
  const loadDownloads = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/list`);
      const data = await response.json();

      if (data.success) {
        setDownloads(data.downloads);
      }
    } catch (error) {
      console.error('Failed to load downloads:', error);
    }
  };

  /**
   * Load download history
   */
  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/history?limit=50`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  /**
   * Load download statistics
   */
  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/statistics`);
      const data = await response.json();

      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  /**
   * Load download details
   */
  const loadDownloadDetails = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/${taskId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedDownload(data.download);
      }
    } catch (error) {
      console.error('Failed to load download details:', error);
    }
  };

  /**
   * Add new download
   */
  const handleAddDownload = async () => {
    if (!newDownload.url || !newDownload.filename) {
      alert('Please provide URL and filename');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/downloads/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDownload,
          speed_limit: newDownload.speed_limit ? parseInt(newDownload.speed_limit) : null,
          connections: parseInt(newDownload.connections),
          checksum: newDownload.checksum || null
        })
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setNewDownload({
          url: '',
          destination: './downloads',
          filename: '',
          priority: 'NORMAL',
          speed_limit: null,
          connections: 1,
          checksum: ''
        });

        setShowAddDialog(false);
        loadDownloads();
      } else {
        alert(`Error: ${data.detail || 'Failed to add download'}`);
      }
    } catch (error) {
      console.error('Add download error:', error);
      alert('Failed to add download');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pause download
   */
  const handlePause = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/${taskId}/pause`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        loadDownloads();
      }
    } catch (error) {
      console.error('Pause download error:', error);
    }
  };

  /**
   * Resume download
   */
  const handleResume = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/${taskId}/resume`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        loadDownloads();
      }
    } catch (error) {
      console.error('Resume download error:', error);
    }
  };

  /**
   * Cancel download
   */
  const handleCancel = async (taskId) => {
    if (!window.confirm('Are you sure you want to cancel this download?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/downloads/${taskId}/cancel`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        loadDownloads();
        if (selectedDownload && selectedDownload.id === taskId) {
          setSelectedDownload(null);
        }
      }
    } catch (error) {
      console.error('Cancel download error:', error);
    }
  };

  /**
   * Retry failed download
   */
  const handleRetry = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/${taskId}/retry`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        loadDownloads();
      }
    } catch (error) {
      console.error('Retry download error:', error);
    }
  };

  /**
   * Set download priority
   */
  const handleSetPriority = async (taskId, priority) => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/set-priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, priority })
      });

      const data = await response.json();

      if (data.success) {
        loadDownloads();
      }
    } catch (error) {
      console.error('Set priority error:', error);
    }
  };

  /**
   * Set speed limit
   */
  const handleSetSpeedLimit = async (taskId, speedLimit) => {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/set-speed-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          speed_limit: speedLimit ? parseInt(speedLimit) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        loadDownloads();
      }
    } catch (error) {
      console.error('Set speed limit error:', error);
    }
  };

  /**
   * Format bytes
   */
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format speed
   */
  const formatSpeed = (bytesPerSecond) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  /**
   * Format time
   */
  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity) return '--:--';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'paused':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#6b7280';
      case 'verifying':
        return '#8b5cf6';
      case 'retrying':
        return '#ec4899';
      default:
        return '#6b7280';
    }
  };

  /**
   * Get priority badge color
   */
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3: // URGENT
        return '#ef4444';
      case 2: // HIGH
        return '#f59e0b';
      case 1: // NORMAL
        return '#3b82f6';
      case 0: // LOW
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  /**
   * Filter downloads
   */
  const getFilteredDownloads = () => {
    switch (activeTab) {
      case 'active':
        return downloads.filter(d => ['pending', 'downloading', 'paused', 'retrying', 'verifying'].includes(d.status));
      case 'completed':
        return downloads.filter(d => d.status === 'completed');
      case 'failed':
        return downloads.filter(d => d.status === 'failed');
      default:
        return downloads;
    }
  };

  const filteredDownloads = getFilteredDownloads();

  return (
    <div className="download-manager-container">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">📥 Advanced Download Manager</h3>
            <div className="card-description">
              Manage downloads with pause/resume, priority queue, and speed limiting
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddDialog(true)}>
            ➕ Add Download
          </button>
        </div>

        {/* Statistics */}
        <div className="download-stats">
          <div className="stat-card">
            <div className="stat-label">Total Downloads</div>
            <div className="stat-value">{statistics.total_downloads || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {statistics.completed_downloads || 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>
              {statistics.failed_downloads || 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Downloaded</div>
            <div className="stat-value">
              {formatBytes(statistics.total_bytes_downloaded || 0)}
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              🔄 Active ({downloads.filter(d => ['pending', 'downloading', 'paused', 'retrying', 'verifying'].includes(d.status)).length})
            </button>
            <button
              className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              ✅ Completed ({downloads.filter(d => d.status === 'completed').length})
            </button>
            <button
              className={`tab ${activeTab === 'failed' ? 'active' : ''}`}
              onClick={() => setActiveTab('failed')}
            >
              ❌ Failed ({downloads.filter(d => d.status === 'failed').length})
            </button>
            <button
              className={`tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => { setActiveTab('history'); loadHistory(); }}
            >
              📜 History ({history.length})
            </button>
          </div>

          {/* Downloads List */}
          <div className="downloads-list">
            {activeTab !== 'history' ? (
              filteredDownloads.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">No {activeTab} downloads</div>
                </div>
              ) : (
                filteredDownloads.map((download) => (
                  <div key={download.id} className="download-item">
                    <div className="download-header">
                      <div className="download-title">{download.filename}</div>
                      <div className="download-actions">
                        {/* Priority Selector */}
                        <select
                          value={download.priority}
                          onChange={(e) => handleSetPriority(download.id, e.target.value)}
                          className="priority-select"
                          style={{ borderColor: getPriorityColor(download.priority) }}
                        >
                          <option value="0">Low</option>
                          <option value="1">Normal</option>
                          <option value="2">High</option>
                          <option value="3">Urgent</option>
                        </select>

                        {/* Control Buttons */}
                        {download.status === 'downloading' && (
                          <button
                            onClick={() => handlePause(download.id)}
                            className="btn-icon"
                            title="Pause"
                          >
                            ⏸️
                          </button>
                        )}

                        {download.status === 'paused' && (
                          <button
                            onClick={() => handleResume(download.id)}
                            className="btn-icon"
                            title="Resume"
                          >
                            ▶️
                          </button>
                        )}

                        {download.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(download.id)}
                            className="btn-icon"
                            title="Retry"
                          >
                            🔄
                          </button>
                        )}

                        {['pending', 'downloading', 'paused'].includes(download.status) && (
                          <button
                            onClick={() => handleCancel(download.id)}
                            className="btn-icon"
                            title="Cancel"
                          >
                            ❌
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedDownload(download)}
                          className="btn-icon"
                          title="Details"
                        >
                          ℹ️
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="download-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${download.progress || 0}%`,
                            backgroundColor: getStatusColor(download.status)
                          }}
                        />
                      </div>
                      <div className="progress-text">
                        {Math.round(download.progress || 0)}%
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="download-stats-row">
                      <div className="stat-item">
                        <span className="stat-label">Status:</span>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(download.status) }}
                        >
                          {download.status}
                        </span>
                      </div>

                      {download.status === 'downloading' && (
                        <>
                          <div className="stat-item">
                            <span className="stat-label">Speed:</span>
                            <span className="stat-value">{formatSpeed(download.speed || 0)}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">ETA:</span>
                            <span className="stat-value">{formatTime(download.eta)}</span>
                          </div>
                        </>
                      )}

                      <div className="stat-item">
                        <span className="stat-label">Size:</span>
                        <span className="stat-value">
                          {formatBytes(download.downloaded_size)} / {formatBytes(download.total_size)}
                        </span>
                      </div>

                      {download.error_message && (
                        <div className="stat-item error">
                          <span className="stat-label">Error:</span>
                          <span className="stat-value">{download.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              // History view
              history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">No download history</div>
                </div>
              ) : (
                history.map((item, index) => (
                  <div key={item.id || index} className="history-item">
                    <div className="history-icon">
                      {item.status === 'completed' ? '✅' : '❌'}
                    </div>
                    <div className="history-details">
                      <div className="history-title">{item.filename}</div>
                      <div className="history-meta">
                        {formatBytes(item.downloaded_size)} • {new Date(item.completed_at * 1000).toLocaleString()}
                      </div>
                      {item.error_message && (
                        <div className="history-error">{item.error_message}</div>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* Add Download Dialog */}
      {showAddDialog && (
        <div className="modal-overlay" onClick={() => setShowAddDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Download</h3>
              <button className="modal-close" onClick={() => setShowAddDialog(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>URL *</label>
                <input
                  type="text"
                  value={newDownload.url}
                  onChange={(e) => setNewDownload({ ...newDownload, url: e.target.value })}
                  placeholder="https://example.com/file.zip"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Filename *</label>
                <input
                  type="text"
                  value={newDownload.filename}
                  onChange={(e) => setNewDownload({ ...newDownload, filename: e.target.value })}
                  placeholder="file.zip"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  value={newDownload.destination}
                  onChange={(e) => setNewDownload({ ...newDownload, destination: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newDownload.priority}
                    onChange={(e) => setNewDownload({ ...newDownload, priority: e.target.value })}
                    className="form-select"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Connections</label>
                  <input
                    type="number"
                    value={newDownload.connections}
                    onChange={(e) => setNewDownload({ ...newDownload, connections: e.target.value })}
                    min="1"
                    max="16"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Speed Limit (bytes/sec, empty = unlimited)</label>
                <input
                  type="number"
                  value={newDownload.speed_limit || ''}
                  onChange={(e) => setNewDownload({ ...newDownload, speed_limit: e.target.value })}
                  placeholder="1048576 (1 MB/s)"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Checksum (optional)</label>
                <input
                  type="text"
                  value={newDownload.checksum}
                  onChange={(e) => setNewDownload({ ...newDownload, checksum: e.target.value })}
                  placeholder="SHA256 hash"
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddDialog(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddDownload}
                disabled={loading || !newDownload.url || !newDownload.filename}
              >
                {loading ? 'Adding...' : 'Add Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Details Modal */}
      {selectedDownload && (
        <div className="modal-overlay" onClick={() => setSelectedDownload(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Download Details</h3>
              <button className="modal-close" onClick={() => setSelectedDownload(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Filename:</span>
                  <span className="detail-value">{selectedDownload.filename}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">URL:</span>
                  <span className="detail-value detail-url">{selectedDownload.url}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedDownload.status) }}
                  >
                    {selectedDownload.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Progress:</span>
                  <span className="detail-value">{Math.round(selectedDownload.progress || 0)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Downloaded:</span>
                  <span className="detail-value">{formatBytes(selectedDownload.downloaded_size)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Size:</span>
                  <span className="detail-value">{formatBytes(selectedDownload.total_size)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Speed:</span>
                  <span className="detail-value">{formatSpeed(selectedDownload.speed || 0)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ETA:</span>
                  <span className="detail-value">{formatTime(selectedDownload.eta)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Retry Count:</span>
                  <span className="detail-value">{selectedDownload.retry_count} / {selectedDownload.max_retries}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Connections:</span>
                  <span className="detail-value">{selectedDownload.connections}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Resume Support:</span>
                  <span className="detail-value">{selectedDownload.supports_resume ? 'Yes' : 'No'}</span>
                </div>
                {selectedDownload.speed_limit && (
                  <div className="detail-item">
                    <span className="detail-label">Speed Limit:</span>
                    <span className="detail-value">{formatSpeed(selectedDownload.speed_limit)}</span>
                  </div>
                )}
                {selectedDownload.error_message && (
                  <div className="detail-item detail-full">
                    <span className="detail-label">Error:</span>
                    <span className="detail-value error">{selectedDownload.error_message}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedDownload(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
