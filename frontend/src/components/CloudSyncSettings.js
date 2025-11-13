import React, { useState, useEffect } from "react";

export default function CloudSyncSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    provider: "disabled",
    auto_sync: false,
    remote_folder: "TelegramArchive",
    has_credentials: false,
  });

  const [credentials, setCredentials] = useState({
    // Google Drive OAuth2
    client_id: "",
    client_secret: "",
    refresh_token: "",
    // Dropbox
    access_token: "",
  });

  const [showCredentials, setShowCredentials] = useState(false);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/cloud-sync/config");
      const data = await response.json();
      if (data.ok) {
        setConfig({
          provider: data.provider,
          auto_sync: data.auto_sync,
          remote_folder: data.remote_folder,
          has_credentials: data.has_credentials,
        });
      }
    } catch (error) {
      alert("Failed to load cloud sync config: " + error.message);
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const payload = {
        provider: config.provider,
        auto_sync: config.auto_sync,
        remote_folder: config.remote_folder,
      };

      // Add credentials if provider is enabled and credentials are provided
      if (config.provider !== "disabled") {
        if (config.provider === "google_drive") {
          if (credentials.client_id || credentials.client_secret || credentials.refresh_token) {
            payload.credentials = {
              client_id: credentials.client_id,
              client_secret: credentials.client_secret,
              refresh_token: credentials.refresh_token,
            };
          }
        } else if (config.provider === "dropbox") {
          if (credentials.access_token) {
            payload.credentials = {
              access_token: credentials.access_token,
            };
          }
        }
      }

      const response = await fetch("http://localhost:8000/api/cloud-sync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        alert("Cloud sync configuration saved successfully!");
        loadConfig();
        setShowCredentials(false);
        // Clear credential fields for security
        setCredentials({
          client_id: "",
          client_secret: "",
          refresh_token: "",
          access_token: "",
        });
      } else {
        alert("Failed to save config: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const manualSync = async () => {
    if (config.provider === "disabled") {
      alert("Please configure cloud sync first");
      return;
    }

    if (!config.has_credentials) {
      alert("Please add credentials first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/cloud-sync/sync", {
        method: "POST",
      });
      const data = await response.json();
      if (data.ok) {
        alert(
          `Sync completed successfully!\nFiles synced: ${data.files_synced}\nTotal size: ${data.total_size_mb} MB`
        );
      } else {
        alert("Sync failed: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>☁️ Cloud Sync Settings</h2>
        {config.has_credentials && config.provider !== "disabled" && (
          <button
            onClick={manualSync}
            style={styles.syncButton}
            disabled={loading}
          >
            {loading ? "Syncing..." : "🔄 Sync Now"}
          </button>
        )}
      </div>

      <p style={styles.description}>
        Automatically sync your downloaded media to Google Drive or Dropbox for
        backup and accessibility.
      </p>

      {/* Provider Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Cloud Provider</h3>
        <div style={styles.providerGrid}>
          <label
            style={{
              ...styles.providerCard,
              ...(config.provider === "disabled" ? styles.providerCardActive : {}),
            }}
          >
            <input
              type="radio"
              name="provider"
              value="disabled"
              checked={config.provider === "disabled"}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              disabled={loading}
            />
            <div style={styles.providerInfo}>
              <span style={styles.providerIcon}>🚫</span>
              <span style={styles.providerName}>Disabled</span>
              <span style={styles.providerDesc}>No cloud sync</span>
            </div>
          </label>

          <label
            style={{
              ...styles.providerCard,
              ...(config.provider === "google_drive"
                ? styles.providerCardActive
                : {}),
            }}
          >
            <input
              type="radio"
              name="provider"
              value="google_drive"
              checked={config.provider === "google_drive"}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              disabled={loading}
            />
            <div style={styles.providerInfo}>
              <span style={styles.providerIcon}>📁</span>
              <span style={styles.providerName}>Google Drive</span>
              <span style={styles.providerDesc}>15 GB free</span>
            </div>
          </label>

          <label
            style={{
              ...styles.providerCard,
              ...(config.provider === "dropbox" ? styles.providerCardActive : {}),
            }}
          >
            <input
              type="radio"
              name="provider"
              value="dropbox"
              checked={config.provider === "dropbox"}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              disabled={loading}
            />
            <div style={styles.providerInfo}>
              <span style={styles.providerIcon}>📦</span>
              <span style={styles.providerName}>Dropbox</span>
              <span style={styles.providerDesc}>2 GB free</span>
            </div>
          </label>
        </div>
      </div>

      {/* Settings */}
      {config.provider !== "disabled" && (
        <>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Sync Settings</h3>

            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={config.auto_sync}
                  onChange={(e) =>
                    setConfig({ ...config, auto_sync: e.target.checked })
                  }
                  disabled={loading}
                />
                <span>Automatically sync after downloads</span>
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Remote Folder Name</label>
              <input
                type="text"
                value={config.remote_folder}
                onChange={(e) =>
                  setConfig({ ...config, remote_folder: e.target.value })
                }
                placeholder="TelegramArchive"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          {/* Credentials */}
          <div style={styles.section}>
            <div style={styles.credentialsHeader}>
              <h3 style={styles.sectionTitle}>
                Credentials{" "}
                {config.has_credentials && (
                  <span style={styles.credentialsBadge}>Configured ✓</span>
                )}
              </h3>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                style={styles.credentialsToggle}
              >
                {showCredentials ? "Hide" : "Show/Update"} Credentials
              </button>
            </div>

            {showCredentials && (
              <div style={styles.credentialsForm}>
                {config.provider === "google_drive" && (
                  <>
                    <p style={styles.credentialsHelp}>
                      To get Google Drive credentials:
                      <ol style={styles.helpList}>
                        <li>
                          Go to{" "}
                          <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.link}
                          >
                            Google Cloud Console
                          </a>
                        </li>
                        <li>Create OAuth 2.0 Client ID</li>
                        <li>Enable Google Drive API</li>
                        <li>Copy Client ID, Client Secret, and Refresh Token</li>
                      </ol>
                    </p>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Client ID</label>
                      <input
                        type="text"
                        value={credentials.client_id}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            client_id: e.target.value,
                          })
                        }
                        placeholder="123456789-xxxxxxxxxxxxx.apps.googleusercontent.com"
                        style={styles.input}
                        disabled={loading}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Client Secret</label>
                      <input
                        type="password"
                        value={credentials.client_secret}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            client_secret: e.target.value,
                          })
                        }
                        placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
                        style={styles.input}
                        disabled={loading}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Refresh Token</label>
                      <input
                        type="password"
                        value={credentials.refresh_token}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            refresh_token: e.target.value,
                          })
                        }
                        placeholder="1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        style={styles.input}
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                {config.provider === "dropbox" && (
                  <>
                    <p style={styles.credentialsHelp}>
                      To get Dropbox access token:
                      <ol style={styles.helpList}>
                        <li>
                          Go to{" "}
                          <a
                            href="https://www.dropbox.com/developers/apps"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.link}
                          >
                            Dropbox App Console
                          </a>
                        </li>
                        <li>Create a new app (Scoped Access, Full Dropbox)</li>
                        <li>Generate an access token</li>
                        <li>Copy and paste it below</li>
                      </ol>
                    </p>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Access Token</label>
                      <input
                        type="password"
                        value={credentials.access_token}
                        onChange={(e) =>
                          setCredentials({
                            ...credentials,
                            access_token: e.target.value,
                          })
                        }
                        placeholder="sl.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        style={styles.input}
                        disabled={loading}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div style={styles.actions}>
            <button
              onClick={saveConfig}
              style={styles.saveButton}
              disabled={loading}
            >
              {loading ? "Saving..." : "💾 Save Configuration"}
            </button>
          </div>
        </>
      )}

      {/* Just save if disabled */}
      {config.provider === "disabled" && (
        <div style={styles.actions}>
          <button
            onClick={saveConfig}
            style={styles.saveButton}
            disabled={loading}
          >
            {loading ? "Saving..." : "💾 Save Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "var(--bg-secondary, #f5f5f5)",
    borderRadius: "8px",
    marginTop: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  title: {
    fontSize: "24px",
    margin: 0,
    color: "var(--text-primary, #333)",
  },
  description: {
    fontSize: "14px",
    color: "var(--text-secondary, #666)",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  syncButton: {
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  section: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "15px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "15px",
    color: "var(--text-primary, #333)",
  },
  providerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "10px",
  },
  providerCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "15px",
    border: "2px solid var(--border-color, #ddd)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  providerCardActive: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  providerInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "10px",
  },
  providerIcon: {
    fontSize: "32px",
    marginBottom: "5px",
  },
  providerName: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "var(--text-primary, #333)",
  },
  providerDesc: {
    fontSize: "12px",
    color: "var(--text-secondary, #666)",
  },
  formGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "5px",
    color: "var(--text-primary, #333)",
  },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    border: "1px solid var(--border-color, #ddd)",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  credentialsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  credentialsBadge: {
    fontSize: "12px",
    padding: "2px 8px",
    backgroundColor: "#4CAF50",
    color: "white",
    borderRadius: "12px",
    fontWeight: "normal",
    marginLeft: "10px",
  },
  credentialsToggle: {
    padding: "6px 12px",
    fontSize: "12px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  credentialsForm: {
    padding: "15px",
    backgroundColor: "var(--bg-secondary, #f9f9f9)",
    borderRadius: "4px",
  },
  credentialsHelp: {
    fontSize: "13px",
    color: "var(--text-secondary, #666)",
    marginBottom: "15px",
    lineHeight: "1.5",
  },
  helpList: {
    marginTop: "10px",
    paddingLeft: "20px",
  },
  link: {
    color: "#2196F3",
    textDecoration: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    marginTop: "20px",
  },
  saveButton: {
    padding: "12px 30px",
    fontSize: "16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
