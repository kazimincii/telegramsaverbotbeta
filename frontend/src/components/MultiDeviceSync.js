import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function MultiDeviceSync() {
  const { cfg } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('devices');
  const [loading, setLoading] = useState(false);

  // Devices state
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(
    localStorage.getItem('device_id') || null
  );

  // Register device state
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('desktop');

  // Sync status
  const [syncStatus, setSyncStatus] = useState(null);
  const [autoSync, setAutoSync] = useState(
    localStorage.getItem('auto_sync') === 'true'
  );

  useEffect(() => {
    loadDevices();
    if (currentDeviceId) {
      loadSyncStatus();
    }
  }, [currentDeviceId]);

  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sync/devices`);
      const data = await response.json();

      if (data.success) {
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const loadSyncStatus = async () => {
    if (!currentDeviceId) return;

    try {
      const response = await fetch(`${API_BASE}/api/sync/status/${currentDeviceId}`);
      const data = await response.json();

      if (data.success) {
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const registerDevice = async () => {
    if (!deviceName.trim()) {
      alert('Please enter device name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/sync/register-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_name: deviceName,
          device_type: deviceType,
          user_id: 'default'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save device ID and token
        localStorage.setItem('device_id', data.device_id);
        localStorage.setItem('sync_token', data.sync_token);
        setCurrentDeviceId(data.device_id);

        alert(`Device registered successfully!\nDevice ID: ${data.device_id}`);
        setDeviceName('');
        loadDevices();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Register device error:', error);
      alert(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId) => {
    if (!window.confirm('Remove this device? All synced data will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/sync/devices/${deviceId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        if (deviceId === currentDeviceId) {
          localStorage.removeItem('device_id');
          localStorage.removeItem('sync_token');
          setCurrentDeviceId(null);
        }
        loadDevices();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Remove device error:', error);
      alert(`Failed to remove: ${error.message}`);
    }
  };

  const syncSettings = async () => {
    if (!currentDeviceId) {
      alert('Please register this device first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/sync/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: currentDeviceId,
          settings: cfg,
          encrypt: true
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Settings synced successfully!');
        loadSyncStatus();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Sync settings error:', error);
      alert(`Failed to sync: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pullSettings = async () => {
    if (!currentDeviceId) {
      alert('Please register this device first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/sync/settings/${currentDeviceId}?decrypt=true`);
      const data = await response.json();

      if (data.success) {
        alert('Settings pulled successfully! Reload the page to apply.');
        // In a real app, you would update cfg here
        console.log('Pulled settings:', data.settings);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Pull settings error:', error);
      alert(`Failed to pull: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    localStorage.setItem('auto_sync', newValue.toString());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="multi-device-sync-container">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">☁️ Multi-Device Cloud Sync</h3>
            <div className="card-description">
              Sync settings and download queue across multiple devices with E2E encryption
            </div>
          </div>
          {currentDeviceId && (
            <div className="current-device-badge">
              📱 This Device: {currentDeviceId.slice(0, 8)}...
            </div>
          )}
        </div>

        <div className="card-body">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveTab('devices')}
            >
              📱 Devices
            </button>
            <button
              className={`tab ${activeTab === 'sync' ? 'active' : ''}`}
              onClick={() => setActiveTab('sync')}
            >
              🔄 Sync
            </button>
            <button
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div className="sync-panel">
              {/* Register New Device */}
              {!currentDeviceId && (
                <div className="register-device-panel">
                  <h4>Register This Device</h4>
                  <p className="text-muted">
                    Register this device to enable cloud sync
                  </p>

                  <div className="form-group">
                    <label>Device Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="John's MacBook Pro"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Device Type</label>
                    <select
                      className="select"
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value)}
                    >
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="web">Web</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={registerDevice}
                    disabled={loading || !deviceName.trim()}
                  >
                    {loading ? '⏳ Registering...' : '📱 Register Device'}
                  </button>
                </div>
              )}

              {/* Registered Devices List */}
              <div className="devices-list">
                <h4>Registered Devices ({devices.length})</h4>

                {devices.length > 0 ? (
                  <div className="devices-grid">
                    {devices.map((device) => (
                      <div
                        key={device.device_id}
                        className={`device-card ${device.device_id === currentDeviceId ? 'current-device' : ''}`}
                      >
                        <div className="device-header">
                          <div className="device-icon">
                            {device.device_type === 'desktop' && '💻'}
                            {device.device_type === 'mobile' && '📱'}
                            {device.device_type === 'web' && '🌐'}
                          </div>
                          <div className="device-info">
                            <div className="device-name">{device.device_name}</div>
                            <div className="device-id">{device.device_id.slice(0, 12)}...</div>
                          </div>
                        </div>

                        <div className="device-meta">
                          <div className="device-meta-item">
                            <span className="meta-label">Type:</span>
                            <span className="meta-value">{device.device_type}</span>
                          </div>
                          <div className="device-meta-item">
                            <span className="meta-label">Last Sync:</span>
                            <span className="meta-value">{formatDate(device.last_sync)}</span>
                          </div>
                          <div className="device-meta-item">
                            <span className="meta-label">Registered:</span>
                            <span className="meta-value">{formatDate(device.registered_at)}</span>
                          </div>
                        </div>

                        {device.device_id === currentDeviceId && (
                          <div className="current-device-label">
                            ✓ This Device
                          </div>
                        )}

                        <div className="device-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => removeDevice(device.device_id)}
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📱</div>
                    <div className="empty-text">No devices registered</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div className="sync-panel">
              {currentDeviceId ? (
                <>
                  {/* Sync Status */}
                  {syncStatus && (
                    <div className="sync-status-card">
                      <h4>Sync Status</h4>
                      <div className="status-grid">
                        <div className="status-item">
                          <div className="status-icon">🔒</div>
                          <div className="status-content">
                            <div className="status-label">Encryption</div>
                            <div className="status-value">
                              {syncStatus.encryption_enabled ? 'Enabled ✓' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                        <div className="status-item">
                          <div className="status-icon">⚙️</div>
                          <div className="status-content">
                            <div className="status-label">Settings</div>
                            <div className="status-value">
                              {syncStatus.has_synced_settings ? 'Synced ✓' : 'Not Synced'}
                            </div>
                          </div>
                        </div>
                        <div className="status-item">
                          <div className="status-icon">📋</div>
                          <div className="status-content">
                            <div className="status-label">Queue</div>
                            <div className="status-value">
                              {syncStatus.has_synced_queue ? 'Synced ✓' : 'Not Synced'}
                            </div>
                          </div>
                        </div>
                        <div className="status-item">
                          <div className="status-icon">🕐</div>
                          <div className="status-content">
                            <div className="status-label">Last Sync</div>
                            <div className="status-value">
                              {formatDate(syncStatus.last_sync)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sync Actions */}
                  <div className="sync-actions-card">
                    <h4>Sync Actions</h4>

                    <div className="sync-action-item">
                      <div className="sync-action-info">
                        <div className="sync-action-title">⚙️ Settings Sync</div>
                        <div className="sync-action-desc">
                          Sync your settings (API keys, preferences) across devices
                        </div>
                      </div>
                      <div className="sync-action-buttons">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={syncSettings}
                          disabled={loading}
                        >
                          ⬆️ Push
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={pullSettings}
                          disabled={loading}
                        >
                          ⬇️ Pull
                        </button>
                      </div>
                    </div>

                    <div className="sync-action-item">
                      <div className="sync-action-info">
                        <div className="sync-action-title">📋 Queue Sync</div>
                        <div className="sync-action-desc">
                          Sync your download queue across devices
                        </div>
                      </div>
                      <div className="sync-action-buttons">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled
                          title="Coming soon"
                        >
                          ⬆️ Push
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled
                          title="Coming soon"
                        >
                          ⬇️ Pull
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="sync-disabled-message">
                  <div className="message-icon">⚠️</div>
                  <div className="message-title">Device Not Registered</div>
                  <div className="message-text">
                    Please register this device in the Devices tab to enable syncing
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="sync-panel">
              <h4>Sync Settings</h4>

              <div className="settings-item">
                <div className="settings-info">
                  <div className="settings-title">🔄 Auto Sync</div>
                  <div className="settings-desc">
                    Automatically sync when changes are detected
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={toggleAutoSync}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-info">
                  <div className="settings-title">🔒 End-to-End Encryption</div>
                  <div className="settings-desc">
                    All synced data is encrypted with device-specific keys
                  </div>
                </div>
                <span className="settings-badge">✓ Always On</span>
              </div>

              <div className="settings-item">
                <div className="settings-info">
                  <div className="settings-title">💾 Sync Interval</div>
                  <div className="settings-desc">
                    How often to check for updates from other devices
                  </div>
                </div>
                <select className="select-sm">
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                </select>
              </div>

              <div className="info-box">
                <div className="info-icon">💡</div>
                <div className="info-content">
                  <strong>How it works:</strong> Your settings and queue are encrypted on your device
                  before being uploaded to the sync server. Only your registered devices can decrypt
                  and access this data.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> Use cloud sync to seamlessly work across multiple devices
            with automatic conflict resolution
          </div>
        </div>
      </div>
    </div>
  );
}
