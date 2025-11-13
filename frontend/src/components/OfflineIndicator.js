import React, { useState, useEffect } from 'react';
import connectionMonitor from '../services/connectionMonitor';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initialize connection monitor
    connectionMonitor.init();

    // Listen for connection changes
    const unsubscribe = connectionMonitor.addListener((status, online) => {
      setIsOnline(online);
      setStats(connectionMonitor.getStats());
    });

    // Update stats periodically
    const interval = setInterval(() => {
      setStats(connectionMonitor.getStats());
    }, 5000);

    // Initial stats
    setStats(connectionMonitor.getStats());

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    await connectionMonitor.processSyncQueue();
    setStats(connectionMonitor.getStats());
  };

  const handleClearQueue = () => {
    connectionMonitor.clearSyncQueue();
    setStats(connectionMonitor.getStats());
  };

  const toggleAutoSync = () => {
    const newValue = !stats?.autoSyncEnabled;
    connectionMonitor.setAutoSync(newValue);
    setStats(connectionMonitor.getStats());
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Don't show indicator when online
  if (isOnline && (!stats || stats.queueLength === 0)) {
    return null;
  }

  return (
    <>
      {/* Floating indicator */}
      <div
        className={`offline-indicator ${isOnline ? 'offline-indicator-online' : 'offline-indicator-offline'}`}
        onClick={() => setShowDetails(!showDetails)}
        title={isOnline ? 'Online' : 'Offline - Click for details'}
      >
        <div className="offline-indicator-icon">
          {isOnline ? '🟢' : '🔴'}
        </div>
        <div className="offline-indicator-text">
          {isOnline ? 'Online' : 'Offline'}
        </div>
        {stats && stats.queueLength > 0 && (
          <div className="offline-indicator-badge">
            {stats.queueLength}
          </div>
        )}
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="offline-details-panel">
          <div className="offline-details-header">
            <h3>Connection Status</h3>
            <button
              className="btn-close"
              onClick={() => setShowDetails(false)}
            >
              ✕
            </button>
          </div>

          <div className="offline-details-body">
            <div className="offline-status-row">
              <span className="offline-status-label">Status:</span>
              <span className={`offline-status-value ${isOnline ? 'text-success' : 'text-danger'}`}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>

            {stats?.lastOnlineTime && (
              <div className="offline-status-row">
                <span className="offline-status-label">Last Online:</span>
                <span className="offline-status-value">
                  {formatTime(stats.lastOnlineTime)}
                </span>
              </div>
            )}

            {stats?.lastOfflineTime && (
              <div className="offline-status-row">
                <span className="offline-status-label">Last Offline:</span>
                <span className="offline-status-value">
                  {formatTime(stats.lastOfflineTime)}
                </span>
              </div>
            )}

            <div className="offline-status-row">
              <span className="offline-status-label">Sync Queue:</span>
              <span className="offline-status-value">
                {stats?.queueLength || 0} items
              </span>
            </div>

            <div className="offline-status-row">
              <span className="offline-status-label">Auto Sync:</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={stats?.autoSyncEnabled || false}
                  onChange={toggleAutoSync}
                />
                <span className="switch-slider"></span>
              </label>
            </div>

            {stats && stats.queueLength > 0 && (
              <div className="offline-actions">
                {isOnline && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSync}
                  >
                    🔄 Sync Now
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearQueue}
                >
                  🗑️ Clear Queue
                </button>
              </div>
            )}

            {!isOnline && (
              <div className="offline-warning">
                <div className="offline-warning-icon">⚠️</div>
                <div className="offline-warning-text">
                  You are currently offline. Changes will be synced when connection is restored.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
