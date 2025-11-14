import React, { useState, useEffect } from 'react';
import './CloudStorageManager.css';

const CloudStorageManager = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [currentUser] = useState('user123'); // Mock user ID

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    provider: 'google_drive',
    account_name: '',
    email: '',
    access_token: '',
    storage_quota: 15 * 1024 * 1024 * 1024 // 15GB
  });

  // Files state
  const [files, setFiles] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    local_path: '',
    remote_path: ''
  });

  // Sync state
  const [syncTasks, setSyncTasks] = useState([]);
  const [showSyncFolder, setShowSyncFolder] = useState(false);
  const [syncFolderData, setSyncFolderData] = useState({
    local_folder: '',
    remote_folder: ''
  });

  // Conflicts state
  const [conflicts, setConflicts] = useState([]);

  // Statistics state
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadAccounts();
    loadFiles();
    loadSyncTasks();
    loadStatistics();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/cloud/accounts?user_id=${currentUser}`);
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedAccount) {
          setSelectedAccount(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadFiles = async (accountId = null) => {
    try {
      const url = accountId
        ? `http://localhost:5000/api/cloud/files?account_id=${accountId}`
        : 'http://localhost:5000/api/cloud/files';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const loadSyncTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/cloud/tasks');
      const data = await response.json();
      if (data.success) {
        setSyncTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error loading sync tasks:', error);
    }
  };

  const loadConflicts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/cloud/conflicts');
      const data = await response.json();
      if (data.success) {
        setConflicts(data.conflicts);
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/cloud/statistics?user_id=${currentUser}`);
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.email || !newAccount.access_token) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/cloud/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser,
          ...newAccount
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowAddAccount(false);
        setNewAccount({
          provider: 'google_drive',
          account_name: '',
          email: '',
          access_token: '',
          storage_quota: 15 * 1024 * 1024 * 1024
        });
        loadAccounts();
        alert('Account added successfully!');
      } else {
        alert(data.error || 'Failed to add account');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Failed to add account');
    }
  };

  const handleToggleSync = async (accountId, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/cloud/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_enabled: !currentStatus
        })
      });

      const data = await response.json();
      if (data.success) {
        loadAccounts();
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account? All associated files will be removed.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/cloud/accounts/${accountId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadAccounts();
        alert('Account deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const handleUploadFile = async () => {
    if (!selectedAccount || !uploadData.local_path || !uploadData.remote_path) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/cloud/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          ...uploadData
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowUpload(false);
        setUploadData({ local_path: '', remote_path: '' });
        loadFiles(selectedAccount);
        loadSyncTasks();
        alert('File uploaded successfully!');
      } else {
        alert(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleSyncFolder = async () => {
    if (!selectedAccount || !syncFolderData.local_folder || !syncFolderData.remote_folder) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/cloud/sync-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          ...syncFolderData
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowSyncFolder(false);
        setSyncFolderData({ local_folder: '', remote_folder: '' });
        loadFiles(selectedAccount);
        loadSyncTasks();
        alert(`Folder synced! Uploaded: ${data.uploaded}, Failed: ${data.failed}`);
      } else {
        alert(data.error || 'Failed to sync folder');
      }
    } catch (error) {
      console.error('Error syncing folder:', error);
      alert('Failed to sync folder');
    }
  };

  const handleResolveConflict = async (conflictId, resolution) => {
    try {
      const response = await fetch('http://localhost:5000/api/cloud/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_id: conflictId,
          resolution: resolution
        })
      });

      const data = await response.json();
      if (data.success) {
        loadConflicts();
        loadFiles(selectedAccount);
        alert('Conflict resolved successfully!');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict');
    }
  };

  const getProviderIcon = (provider) => {
    const icons = {
      google_drive: '📁',
      dropbox: '📦',
      onedrive: '☁️',
      aws_s3: '🪣',
      custom: '💾'
    };
    return icons[provider] || '💾';
  };

  const getProviderName = (provider) => {
    const names = {
      google_drive: 'Google Drive',
      dropbox: 'Dropbox',
      onedrive: 'OneDrive',
      aws_s3: 'AWS S3',
      custom: 'Custom'
    };
    return names[provider] || provider;
  };

  const getSyncStatusIcon = (status) => {
    const icons = {
      synced: '✅',
      pending: '⏳',
      syncing: '🔄',
      failed: '❌',
      conflict: '⚠️'
    };
    return icons[status] || '❓';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const renderAccountsTab = () => (
    <div className="accounts-section">
      <div className="section-header">
        <h3>Bulut Depolama Hesapları</h3>
        <button className="btn-primary" onClick={() => setShowAddAccount(true)}>
          ➕ Hesap Ekle
        </button>
      </div>

      {showAddAccount && (
        <div className="modal-overlay" onClick={() => setShowAddAccount(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Yeni Hesap Ekle</h3>

            <div className="form-group">
              <label>Sağlayıcı:</label>
              <select
                value={newAccount.provider}
                onChange={(e) => setNewAccount({...newAccount, provider: e.target.value})}
              >
                <option value="google_drive">Google Drive</option>
                <option value="dropbox">Dropbox</option>
                <option value="onedrive">OneDrive</option>
                <option value="aws_s3">AWS S3</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hesap Adı:</label>
              <input
                type="text"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                placeholder="My Cloud Account"
              />
            </div>

            <div className="form-group">
              <label>E-posta:</label>
              <input
                type="email"
                value={newAccount.email}
                onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                placeholder="user@example.com"
              />
            </div>

            <div className="form-group">
              <label>Access Token:</label>
              <textarea
                value={newAccount.access_token}
                onChange={(e) => setNewAccount({...newAccount, access_token: e.target.value})}
                placeholder="Enter access token..."
                rows="4"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddAccount(false)}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleAddAccount}>
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="accounts-grid">
        {accounts.map((account) => {
          const usagePercentage = (account.storage_used / account.storage_quota) * 100;

          return (
            <div key={account.id} className={`account-card ${!account.is_active ? 'inactive' : ''}`}>
              <div className="account-header">
                <div className="account-icon">{getProviderIcon(account.provider)}</div>
                <div className="account-info">
                  <h4>{account.account_name}</h4>
                  <p>{getProviderName(account.provider)}</p>
                </div>
                <div className={`status-badge ${account.sync_enabled ? 'active' : 'inactive'}`}>
                  {account.sync_enabled ? 'Sync On' : 'Sync Off'}
                </div>
              </div>

              <div className="account-details">
                <div className="detail-item">
                  <span className="label">E-posta:</span>
                  <span className="value">{account.email}</span>
                </div>

                <div className="storage-info">
                  <div className="storage-label">
                    <span>Depolama Kullanımı</span>
                    <span>{formatBytes(account.storage_used)} / {formatBytes(account.storage_quota)}</span>
                  </div>
                  <div className="storage-bar">
                    <div
                      className="storage-fill"
                      style={{
                        width: `${Math.min(usagePercentage, 100)}%`,
                        background: usagePercentage > 90 ? '#f44336' : usagePercentage > 70 ? '#ff9800' : '#4caf50'
                      }}
                    />
                  </div>
                  <div className="storage-percentage">{usagePercentage.toFixed(1)}%</div>
                </div>
              </div>

              <div className="account-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleToggleSync(account.id, account.sync_enabled)}
                  title={account.sync_enabled ? 'Disable Sync' : 'Enable Sync'}
                >
                  {account.sync_enabled ? '⏸️' : '▶️'}
                </button>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setSelectedAccount(account.id);
                    setActiveTab('files');
                    loadFiles(account.id);
                  }}
                  title="View Files"
                >
                  📂
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteAccount(account.id)}
                  title="Delete Account"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="empty-state">
          <p>Henüz bulut depolama hesabı eklenmemiş</p>
          <button className="btn-primary" onClick={() => setShowAddAccount(true)}>
            İlk Hesabınızı Ekleyin
          </button>
        </div>
      )}
    </div>
  );

  const renderFilesTab = () => {
    const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
    const accountFiles = files.filter(f => !selectedAccount || f.account_id === selectedAccount);

    return (
      <div className="files-section">
        <div className="section-header">
          <div>
            <h3>Dosyalar</h3>
            {selectedAccountData && (
              <p className="subheader">{selectedAccountData.account_name} - {getProviderName(selectedAccountData.provider)}</p>
            )}
          </div>
          <div className="header-actions">
            <select
              value={selectedAccount || ''}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                loadFiles(e.target.value);
              }}
              className="account-selector"
            >
              <option value="">Tüm Hesaplar</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {getProviderIcon(acc.provider)} {acc.account_name}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => setShowUpload(true)} disabled={!selectedAccount}>
              ⬆️ Dosya Yükle
            </button>
            <button className="btn-secondary" onClick={() => setShowSyncFolder(true)} disabled={!selectedAccount}>
              📁 Klasör Senkronize Et
            </button>
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="modal-overlay" onClick={() => setShowUpload(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Dosya Yükle</h3>

              <div className="form-group">
                <label>Yerel Dosya Yolu:</label>
                <input
                  type="text"
                  value={uploadData.local_path}
                  onChange={(e) => setUploadData({...uploadData, local_path: e.target.value})}
                  placeholder="/path/to/local/file.txt"
                />
              </div>

              <div className="form-group">
                <label>Uzak Dosya Yolu:</label>
                <input
                  type="text"
                  value={uploadData.remote_path}
                  onChange={(e) => setUploadData({...uploadData, remote_path: e.target.value})}
                  placeholder="/remote/path/file.txt"
                />
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowUpload(false)}>
                  İptal
                </button>
                <button className="btn-primary" onClick={handleUploadFile}>
                  Yükle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Folder Modal */}
        {showSyncFolder && (
          <div className="modal-overlay" onClick={() => setShowSyncFolder(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Klasör Senkronize Et</h3>

              <div className="form-group">
                <label>Yerel Klasör:</label>
                <input
                  type="text"
                  value={syncFolderData.local_folder}
                  onChange={(e) => setSyncFolderData({...syncFolderData, local_folder: e.target.value})}
                  placeholder="/path/to/local/folder"
                />
              </div>

              <div className="form-group">
                <label>Uzak Klasör:</label>
                <input
                  type="text"
                  value={syncFolderData.remote_folder}
                  onChange={(e) => setSyncFolderData({...syncFolderData, remote_folder: e.target.value})}
                  placeholder="/remote/folder"
                />
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowSyncFolder(false)}>
                  İptal
                </button>
                <button className="btn-primary" onClick={handleSyncFolder}>
                  Senkronize Et
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="files-grid">
          {accountFiles.map((file) => (
            <div key={file.id} className="file-card">
              <div className="file-icon">📄</div>
              <div className="file-info">
                <h4 className="file-name">{file.remote_path.split('/').pop()}</h4>
                <p className="file-path">{file.remote_path}</p>
                <div className="file-meta">
                  <span>📦 {formatBytes(file.file_size)}</span>
                  <span>{getSyncStatusIcon(file.sync_status)} {file.sync_status}</span>
                  <span>v{file.version}</span>
                </div>
                {file.last_synced && (
                  <p className="file-synced">Son Senkronizasyon: {formatDate(file.last_synced)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {accountFiles.length === 0 && (
          <div className="empty-state">
            <p>Henüz dosya bulunmuyor</p>
          </div>
        )}
      </div>
    );
  };

  const renderSyncTab = () => (
    <div className="sync-section">
      <div className="section-header">
        <h3>Senkronizasyon Görevleri</h3>
        <button className="btn-secondary" onClick={loadSyncTasks}>
          🔄 Yenile
        </button>
      </div>

      <div className="tasks-list">
        {syncTasks.map((task) => {
          const account = accounts.find(acc => acc.id === task.account_id);
          const file = files.find(f => f.id === task.file_id);

          return (
            <div key={task.id} className={`task-card status-${task.status}`}>
              <div className="task-header">
                <div className="task-icon">
                  {task.operation === 'upload' ? '⬆️' : task.operation === 'download' ? '⬇️' : '🗑️'}
                </div>
                <div className="task-info">
                  <h4>{task.operation.toUpperCase()}</h4>
                  {account && <p>{getProviderIcon(account.provider)} {account.account_name}</p>}
                  {file && <p className="task-file">{file.remote_path}</p>}
                </div>
                <div className={`task-status ${task.status}`}>
                  {task.status}
                </div>
              </div>

              <div className="task-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="progress-text">
                  {task.progress.toFixed(1)}% - {formatBytes(task.bytes_transferred)} / {formatBytes(task.total_bytes)}
                </div>
              </div>

              {task.error_message && (
                <div className="task-error">
                  ❌ {task.error_message}
                </div>
              )}

              <div className="task-meta">
                <span>Başlangıç: {formatDate(task.started_at)}</span>
                {task.completed_at && <span>Bitiş: {formatDate(task.completed_at)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {syncTasks.length === 0 && (
        <div className="empty-state">
          <p>Henüz senkronizasyon görevi bulunmuyor</p>
        </div>
      )}
    </div>
  );

  const renderConflictsTab = () => (
    <div className="conflicts-section">
      <div className="section-header">
        <h3>Senkronizasyon Çakışmaları</h3>
        <button className="btn-secondary" onClick={loadConflicts}>
          🔍 Çakışmaları Tara
        </button>
      </div>

      <div className="conflicts-list">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="conflict-card">
            <div className="conflict-header">
              <div className="conflict-icon">⚠️</div>
              <div className="conflict-info">
                <h4>{conflict.remote_path}</h4>
                <p>Yerel ve uzak dosyalar farklı</p>
              </div>
            </div>

            <div className="conflict-comparison">
              <div className="comparison-side">
                <h5>📱 Yerel</h5>
                <p>Boyut: {formatBytes(conflict.local_size)}</p>
                <p>Değişiklik: {formatDate(conflict.local_modified)}</p>
              </div>
              <div className="comparison-divider">VS</div>
              <div className="comparison-side">
                <h5>☁️ Uzak</h5>
                <p>Boyut: {formatBytes(conflict.remote_size)}</p>
                <p>Değişiklik: {formatDate(conflict.remote_modified)}</p>
              </div>
            </div>

            {!conflict.resolution && (
              <div className="conflict-actions">
                <button
                  className="btn-secondary"
                  onClick={() => handleResolveConflict(conflict.id, 'keep_local')}
                >
                  📱 Yerel'i Tut
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleResolveConflict(conflict.id, 'keep_remote')}
                >
                  ☁️ Uzak'ı Tut
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleResolveConflict(conflict.id, 'keep_both')}
                >
                  📋 İkisini de Tut
                </button>
              </div>
            )}

            {conflict.resolution && (
              <div className="conflict-resolved">
                ✅ Çözüldü: {conflict.resolution} ({formatDate(conflict.resolved_at)})
              </div>
            )}
          </div>
        ))}
      </div>

      {conflicts.length === 0 && (
        <div className="empty-state success">
          <p>✅ Çakışma bulunamadı!</p>
        </div>
      )}
    </div>
  );

  const renderStatisticsTab = () => {
    if (!statistics) {
      return <div className="loading">Yükleniyor...</div>;
    }

    return (
      <div className="statistics-section">
        <div className="section-header">
          <h3>İstatistikler</h3>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <span className="stat-value">{statistics.total_accounts}</span>
              <span className="stat-label">Toplam Hesap</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <span className="stat-value">{statistics.total_files}</span>
              <span className="stat-label">Toplam Dosya</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💾</div>
            <div className="stat-content">
              <span className="stat-value">{formatBytes(statistics.total_storage_used)}</span>
              <span className="stat-label">Kullanılan Alan</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <span className="stat-value">{statistics.active_tasks}</span>
              <span className="stat-label">Aktif Görev</span>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="storage-overview">
          <h4>Depolama Kullanımı</h4>
          <div className="storage-bar-large">
            <div
              className="storage-fill-large"
              style={{
                width: `${Math.min(statistics.storage_percentage, 100)}%`,
                background: statistics.storage_percentage > 90 ? '#f44336' :
                           statistics.storage_percentage > 70 ? '#ff9800' : '#4caf50'
              }}
            />
          </div>
          <div className="storage-info-text">
            {formatBytes(statistics.total_storage_used)} / {formatBytes(statistics.total_storage_quota)}
            ({statistics.storage_percentage.toFixed(1)}%)
          </div>
        </div>

        {/* By Provider */}
        {statistics.accounts_by_provider && (
          <div className="breakdown-section">
            <h4>Sağlayıcıya Göre Hesaplar</h4>
            <div className="breakdown-grid">
              {Object.entries(statistics.accounts_by_provider).map(([provider, count]) => (
                <div key={provider} className="breakdown-item">
                  <span className="breakdown-icon">{getProviderIcon(provider)}</span>
                  <span className="breakdown-label">{getProviderName(provider)}</span>
                  <span className="breakdown-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Status */}
        {statistics.files_by_status && (
          <div className="breakdown-section">
            <h4>Dosya Durumları</h4>
            <div className="breakdown-grid">
              {Object.entries(statistics.files_by_status).map(([status, count]) => (
                <div key={status} className="breakdown-item">
                  <span className="breakdown-icon">{getSyncStatusIcon(status)}</span>
                  <span className="breakdown-label">{status}</span>
                  <span className="breakdown-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cloud-storage-manager">
      {/* Header */}
      <div className="cloud-header">
        <h2>☁️ Bulut Depolama Yöneticisi</h2>
        <p>Google Drive, Dropbox, OneDrive ve AWS S3 entegrasyonu</p>
      </div>

      {/* Tabs */}
      <div className="cloud-tabs">
        <button
          className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <span className="tab-icon">🏢</span>
          Hesaplar
        </button>

        <button
          className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <span className="tab-icon">📁</span>
          Dosyalar
        </button>

        <button
          className={`tab-button ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          <span className="tab-icon">🔄</span>
          Senkronizasyon
        </button>

        <button
          className={`tab-button ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('conflicts');
            loadConflicts();
          }}
        >
          <span className="tab-icon">⚠️</span>
          Çakışmalar
        </button>

        <button
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <span className="tab-icon">📊</span>
          İstatistikler
        </button>
      </div>

      {/* Content */}
      <div className="cloud-content">
        {activeTab === 'accounts' && renderAccountsTab()}
        {activeTab === 'files' && renderFilesTab()}
        {activeTab === 'sync' && renderSyncTab()}
        {activeTab === 'conflicts' && renderConflictsTab()}
        {activeTab === 'statistics' && renderStatisticsTab()}
      </div>
    </div>
  );
};

export default CloudStorageManager;
