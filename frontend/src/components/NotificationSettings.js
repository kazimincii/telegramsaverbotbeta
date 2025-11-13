import React, { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    enabled: true,
    sound: true,
    downloadComplete: true,
    downloadError: true,
    downloadProgress: true
  });

  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    // Load current settings
    const currentSettings = notificationService.getSettings();
    setSettings(currentSettings);
  }, []);

  const handleToggle = async (key) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    };
    setSettings(newSettings);
    await notificationService.updateSettings(newSettings);
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.show({
        title: 'Test Notification',
        body: 'Notifications are working correctly! 🎉',
        urgency: 'normal'
      });
      setTestResult('✅ Test notification sent!');
    } catch (error) {
      setTestResult('❌ Failed to send notification: ' + error.message);
    }

    // Clear message after 3 seconds
    setTimeout(() => setTestResult(''), 3000);
  };

  const isSupported = notificationService.isSupported();

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">🔔 Notification Settings</h3>
        <div className="card-description">
          Configure desktop notifications for downloads and events
        </div>
      </div>

      <div className="card-body">
        {!isSupported && (
          <div className="alert alert-warning mb-4">
            <strong>⚠️ Notifications Not Supported</strong>
            <p>Your browser or system doesn't support notifications.</p>
          </div>
        )}

        <div className="form-group mb-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="form-label">Enable Notifications</span>
              <div className="text-small text-muted">
                Show desktop notifications for app events
              </div>
            </div>
            <input
              type="checkbox"
              className="form-checkbox"
              checked={settings.enabled}
              onChange={() => handleToggle('enabled')}
              disabled={!isSupported}
            />
          </label>
        </div>

        {settings.enabled && (
          <>
            <div className="form-group mb-4">
              <label className="flex items-center justify-between">
                <div>
                  <span className="form-label">Sound Effects</span>
                  <div className="text-small text-muted">
                    Play sound when showing notifications
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={settings.sound}
                  onChange={() => handleToggle('sound')}
                />
              </label>
            </div>

            <div className="divider my-4"></div>

            <h4 className="text-md font-semibold mb-3">Notification Types</h4>

            <div className="form-group mb-3">
              <label className="flex items-center justify-between">
                <div>
                  <span className="form-label">Download Complete</span>
                  <div className="text-small text-muted">
                    When download finishes successfully
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={settings.downloadComplete}
                  onChange={() => handleToggle('downloadComplete')}
                />
              </label>
            </div>

            <div className="form-group mb-3">
              <label className="flex items-center justify-between">
                <div>
                  <span className="form-label">Download Errors</span>
                  <div className="text-small text-muted">
                    When download encounters an error
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={settings.downloadError}
                  onChange={() => handleToggle('downloadError')}
                />
              </label>
            </div>

            <div className="form-group mb-4">
              <label className="flex items-center justify-between">
                <div>
                  <span className="form-label">Download Progress</span>
                  <div className="text-small text-muted">
                    Periodic updates during download (throttled)
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={settings.downloadProgress}
                  onChange={() => handleToggle('downloadProgress')}
                />
              </label>
            </div>

            <div className="divider my-4"></div>

            <div className="flex items-center gap-3">
              <button
                className="btn btn-secondary"
                onClick={handleTestNotification}
                disabled={!isSupported}
              >
                🧪 Test Notification
              </button>
              {testResult && (
                <span className="text-small animate-fadeIn">{testResult}</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card-footer">
        <div className="text-small text-muted">
          💡 <strong>Tip:</strong> Notifications work best when the app is running in the background.
          You can minimize the window to the system tray.
        </div>
      </div>
    </div>
  );
}
