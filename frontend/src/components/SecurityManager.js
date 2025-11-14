import React, { useState, useEffect } from 'react';
import './SecurityManager.css';

const SecurityManager = () => {
  const [activeTab, setActiveTab] = useState('apikeys');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // API Keys State
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState(90);
  const [generatedKey, setGeneratedKey] = useState('');

  // Encryption State
  const [encryptText, setEncryptText] = useState('');
  const [decryptText, setDecryptText] = useState('');
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedText, setDecryptedText] = useState('');
  const [encryptAlgorithm, setEncryptAlgorithm] = useState('aes_256_gcm');

  // Password State
  const [password, setPassword] = useState('');
  const [hashedPassword, setHashedPassword] = useState(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyHash, setVerifyHash] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(null);

  // Roles State
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [userRoles, setUserRoles] = useState({});

  // 2FA State
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  // Sessions State
  const [sessions, setSessions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditUser, setAuditUser] = useState('');

  // Statistics State
  const [statistics, setStatistics] = useState(null);

  const availablePermissions = [
    'read',
    'write',
    'delete',
    'admin',
    'upload',
    'download',
    'share',
    'manage_users'
  ];

  const roles = [
    { value: 'admin', label: 'Administrator', color: '#e74c3c' },
    { value: 'moderator', label: 'Moderator', color: '#3498db' },
    { value: 'user', label: 'User', color: '#2ecc71' },
    { value: 'guest', label: 'Guest', color: '#95a5a6' }
  ];

  useEffect(() => {
    loadAPIKeys();
    loadUsers();
    loadSessions();
    loadAuditLogs();
    loadStatistics();
    checkTwoFAStatus();
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // API Keys Functions
  const loadAPIKeys = async () => {
    try {
      const response = await fetch('/api/security/api-keys?user_id=current_user');
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.api_keys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const createAPIKey = async () => {
    if (!newKeyName.trim() || newKeyPermissions.length === 0) {
      showMessage('Lütfen anahtar adı ve en az bir izin seçin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          user_id: 'current_user',
          permissions: newKeyPermissions,
          expiry_days: newKeyExpiry
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedKey(data.api_key.key);
        setNewKeyName('');
        setNewKeyPermissions([]);
        setNewKeyExpiry(90);
        await loadAPIKeys();
        showMessage('API anahtarı başarıyla oluşturuldu!', 'success');
      } else {
        showMessage(data.error || 'API anahtarı oluşturulamadı', 'error');
      }
    } catch (error) {
      showMessage('API anahtarı oluşturma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const revokeAPIKey = async (keyId) => {
    if (!window.confirm('Bu API anahtarını iptal etmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/security/api-keys/${keyId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      if (data.success) {
        await loadAPIKeys();
        showMessage('API anahtarı iptal edildi', 'success');
      } else {
        showMessage(data.error || 'API anahtarı iptal edilemedi', 'error');
      }
    } catch (error) {
      showMessage('API anahtarı iptal etme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission) => {
    setNewKeyPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // Encryption Functions
  const encryptData = async () => {
    if (!encryptText.trim()) {
      showMessage('Lütfen şifrelenecek metni girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plaintext: encryptText,
          algorithm: encryptAlgorithm
        })
      });

      const data = await response.json();
      if (data.success) {
        setEncryptedData(data.encrypted);
        showMessage('Veri başarıyla şifrelendi!', 'success');
      } else {
        showMessage(data.error || 'Şifreleme başarısız', 'error');
      }
    } catch (error) {
      showMessage('Şifreleme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const decryptData = async () => {
    if (!decryptText.trim()) {
      showMessage('Lütfen şifreli metni girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const encData = JSON.parse(decryptText);
      const response = await fetch('/api/security/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: encData.ciphertext,
          key: encData.key,
          nonce: encData.nonce,
          tag: encData.tag,
          algorithm: encData.algorithm
        })
      });

      const data = await response.json();
      if (data.success) {
        setDecryptedText(data.plaintext);
        showMessage('Veri başarıyla çözüldü!', 'success');
      } else {
        showMessage(data.error || 'Şifre çözme başarısız', 'error');
      }
    } catch (error) {
      showMessage('Şifre çözme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyEncryptedData = () => {
    if (encryptedData) {
      navigator.clipboard.writeText(JSON.stringify(encryptedData, null, 2));
      showMessage('Şifreli veri panoya kopyalandı', 'success');
    }
  };

  // Password Functions
  const hashPassword = async () => {
    if (!password.trim()) {
      showMessage('Lütfen bir şifre girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/password/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password
        })
      });

      const data = await response.json();
      if (data.success) {
        setHashedPassword(data.hash);
        showMessage('Şifre başarıyla hash\'lendi!', 'success');
      } else {
        showMessage(data.error || 'Hash oluşturulamadı', 'error');
      }
    } catch (error) {
      showMessage('Hash oluşturma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyPasswordHash = async () => {
    if (!verifyPassword.trim() || !verifyHash.trim()) {
      showMessage('Lütfen şifre ve hash değerini girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const hashData = JSON.parse(verifyHash);
      const response = await fetch('/api/security/password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: verifyPassword,
          hash: hashData.hash,
          salt: hashData.salt,
          algorithm: hashData.algorithm
        })
      });

      const data = await response.json();
      if (data.success) {
        setPasswordVerified(data.verified);
        showMessage(
          data.verified ? 'Şifre doğrulandı!' : 'Şifre eşleşmedi!',
          data.verified ? 'success' : 'error'
        );
      } else {
        showMessage(data.error || 'Doğrulama başarısız', 'error');
      }
    } catch (error) {
      showMessage('Doğrulama hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Roles Functions
  const loadUsers = async () => {
    // Mock users - in production, load from API
    setUsers([
      { id: 'user1', username: 'admin', email: 'admin@example.com' },
      { id: 'user2', username: 'moderator', email: 'mod@example.com' },
      { id: 'user3', username: 'user', email: 'user@example.com' }
    ]);
  };

  const assignRole = async () => {
    if (!selectedUser) {
      showMessage('Lütfen bir kullanıcı seçin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          role: selectedRole
        })
      });

      const data = await response.json();
      if (data.success) {
        setUserRoles(prev => ({ ...prev, [selectedUser]: selectedRole }));
        showMessage('Rol başarıyla atandı!', 'success');
      } else {
        showMessage(data.error || 'Rol atanamadı', 'error');
      }
    } catch (error) {
      showMessage('Rol atama hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2FA Functions
  const checkTwoFAStatus = async () => {
    // Mock check - in production, check from API
    setTwoFAEnabled(false);
  };

  const enableTwoFA = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'current_user'
        })
      });

      const data = await response.json();
      if (data.success) {
        setTwoFASecret(data.secret);
        setTwoFAEnabled(false); // Will be enabled after verification
        showMessage('2FA kurulumu başladı! Kodu doğrulayın.', 'success');
      } else {
        showMessage(data.error || '2FA etkinleştirilemedi', 'error');
      }
    } catch (error) {
      showMessage('2FA etkinleştirme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFA = async () => {
    if (!twoFACode.trim()) {
      showMessage('Lütfen 2FA kodunu girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'current_user',
          code: twoFACode
        })
      });

      const data = await response.json();
      if (data.success && data.verified) {
        setTwoFAEnabled(true);
        setTwoFACode('');
        showMessage('2FA başarıyla etkinleştirildi!', 'success');
      } else {
        showMessage('Geçersiz kod!', 'error');
      }
    } catch (error) {
      showMessage('2FA doğrulama hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFA = async () => {
    if (!window.confirm('2FA\'yı devre dışı bırakmak istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/security/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'current_user'
        })
      });

      const data = await response.json();
      if (data.success) {
        setTwoFAEnabled(false);
        setTwoFASecret('');
        showMessage('2FA devre dışı bırakıldı', 'success');
      } else {
        showMessage(data.error || '2FA devre dışı bırakılamadı', 'error');
      }
    } catch (error) {
      showMessage('2FA devre dışı bırakma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sessions Functions
  const loadSessions = async () => {
    try {
      const response = await fetch('/api/security/sessions?user_id=current_user');
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
        setActiveSessions(data.sessions.filter(s => s.is_valid));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'current_user',
          device_info: navigator.userAgent
        })
      });

      const data = await response.json();
      if (data.success) {
        await loadSessions();
        showMessage('Yeni oturum oluşturuldu!', 'success');
      } else {
        showMessage(data.error || 'Oturum oluşturulamadı', 'error');
      }
    } catch (error) {
      showMessage('Oturum oluşturma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    if (!window.confirm('Bu oturumu sonlandırmak istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      if (data.success) {
        await loadSessions();
        showMessage('Oturum sonlandırıldı', 'success');
      } else {
        showMessage(data.error || 'Oturum sonlandırılamadı', 'error');
      }
    } catch (error) {
      showMessage('Oturum sonlandırma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Audit Logs Functions
  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        user_id: auditUser || 'current_user',
        action: auditFilter !== 'all' ? auditFilter : '',
        limit: '100'
      });

      const response = await fetch(`/api/security/audit-logs?${params}`);
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.audit_logs);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  // Statistics Functions
  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/security/statistics');
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="security-manager">
      <div className="security-header">
        <h2>🔐 Güvenlik & Şifreleme Yönetimi</h2>
        <p>API anahtarları, şifreleme, roller ve güvenlik ayarları</p>
      </div>

      {message.text && (
        <div className={`security-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="security-tabs">
        <button
          className={activeTab === 'apikeys' ? 'active' : ''}
          onClick={() => setActiveTab('apikeys')}
        >
          🔑 API Anahtarları
        </button>
        <button
          className={activeTab === 'encryption' ? 'active' : ''}
          onClick={() => setActiveTab('encryption')}
        >
          🔒 Şifreleme
        </button>
        <button
          className={activeTab === 'passwords' ? 'active' : ''}
          onClick={() => setActiveTab('passwords')}
        >
          🔐 Şifre Hash
        </button>
        <button
          className={activeTab === 'roles' ? 'active' : ''}
          onClick={() => setActiveTab('roles')}
        >
          👥 Roller & İzinler
        </button>
        <button
          className={activeTab === '2fa' ? 'active' : ''}
          onClick={() => setActiveTab('2fa')}
        >
          📱 2FA
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          🖥️ Oturumlar
        </button>
        <button
          className={activeTab === 'audit' ? 'active' : ''}
          onClick={() => setActiveTab('audit')}
        >
          📋 Audit Loglar
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          📊 İstatistikler
        </button>
      </div>

      <div className="security-content">
        {activeTab === 'apikeys' && (
          <div className="apikeys-tab">
            <div className="create-key-section">
              <h3>Yeni API Anahtarı Oluştur</h3>
              <div className="form-group">
                <label>Anahtar Adı</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Örn: Mobil Uygulama"
                />
              </div>
              <div className="form-group">
                <label>İzinler</label>
                <div className="permissions-grid">
                  {availablePermissions.map(perm => (
                    <label key={perm} className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                      />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Geçerlilik Süresi (Gün)</label>
                <input
                  type="number"
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(parseInt(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
              <button
                className="create-button"
                onClick={createAPIKey}
                disabled={loading}
              >
                {loading ? 'Oluşturuluyor...' : '🔑 Anahtar Oluştur'}
              </button>

              {generatedKey && (
                <div className="generated-key">
                  <h4>⚠️ Oluşturulan API Anahtarı</h4>
                  <p>Bu anahtarı güvenli bir yerde saklayın. Bir daha gösterilmeyecek!</p>
                  <div className="key-display">
                    <code>{generatedKey}</code>
                    <button onClick={() => {
                      navigator.clipboard.writeText(generatedKey);
                      showMessage('Anahtar panoya kopyalandı', 'success');
                    }}>
                      📋 Kopyala
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="keys-list">
              <h3>Mevcut API Anahtarları ({apiKeys.length})</h3>
              <div className="keys-grid">
                {apiKeys.map(key => (
                  <div key={key.key_id} className={`key-card ${!key.is_active ? 'inactive' : ''}`}>
                    <div className="key-header">
                      <h4>{key.name}</h4>
                      <span className={`key-status ${key.is_active ? 'active' : 'inactive'}`}>
                        {key.is_active ? '✓ Aktif' : '✗ İptal Edildi'}
                      </span>
                    </div>
                    <div className="key-info">
                      <p><strong>ID:</strong> {key.key_id}</p>
                      <p><strong>Oluşturma:</strong> {formatDate(key.created_at)}</p>
                      <p><strong>Son Geçerlilik:</strong> {formatDate(key.expires_at)}</p>
                      <p><strong>Son Kullanım:</strong> {key.last_used ? formatDate(key.last_used) : 'Hiç kullanılmadı'}</p>
                      <p><strong>Kullanım:</strong> {key.usage_count} kez</p>
                      <div className="key-permissions">
                        <strong>İzinler:</strong>
                        <div className="permission-tags">
                          {key.permissions.map(perm => (
                            <span key={perm} className="permission-tag">{perm}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {key.is_active && (
                      <button
                        className="revoke-button"
                        onClick={() => revokeAPIKey(key.key_id)}
                      >
                        🚫 İptal Et
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'encryption' && (
          <div className="encryption-tab">
            <div className="encrypt-section">
              <h3>Veri Şifreleme</h3>
              <div className="form-group">
                <label>Algoritma</label>
                <select
                  value={encryptAlgorithm}
                  onChange={(e) => setEncryptAlgorithm(e.target.value)}
                >
                  <option value="aes_256_gcm">AES-256-GCM</option>
                  <option value="aes_256_cbc">AES-256-CBC</option>
                  <option value="chacha20_poly1305">ChaCha20-Poly1305</option>
                </select>
              </div>
              <div className="form-group">
                <label>Şifrelenecek Metin</label>
                <textarea
                  value={encryptText}
                  onChange={(e) => setEncryptText(e.target.value)}
                  placeholder="Şifrelemek istediğiniz metni girin..."
                  rows="4"
                />
              </div>
              <button
                className="encrypt-button"
                onClick={encryptData}
                disabled={loading}
              >
                {loading ? 'Şifreleniyor...' : '🔒 Şifrele'}
              </button>

              {encryptedData && (
                <div className="encrypted-result">
                  <div className="result-header">
                    <h4>Şifrelenmiş Veri</h4>
                    <button onClick={copyEncryptedData}>📋 Kopyala</button>
                  </div>
                  <pre>{JSON.stringify(encryptedData, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="decrypt-section">
              <h3>Veri Çözme</h3>
              <div className="form-group">
                <label>Şifreli Veri (JSON)</label>
                <textarea
                  value={decryptText}
                  onChange={(e) => setDecryptText(e.target.value)}
                  placeholder='{"ciphertext": "...", "key": "...", "nonce": "...", "tag": "...", "algorithm": "..."}'
                  rows="6"
                />
              </div>
              <button
                className="decrypt-button"
                onClick={decryptData}
                disabled={loading}
              >
                {loading ? 'Çözülüyor...' : '🔓 Şifreyi Çöz'}
              </button>

              {decryptedText && (
                <div className="decrypted-result">
                  <h4>Çözülmüş Metin</h4>
                  <div className="result-box">{decryptedText}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'passwords' && (
          <div className="passwords-tab">
            <div className="hash-section">
              <h3>Şifre Hash Oluştur</h3>
              <div className="form-group">
                <label>Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin..."
                />
              </div>
              <button
                className="hash-button"
                onClick={hashPassword}
                disabled={loading}
              >
                {loading ? 'Hash Oluşturuluyor...' : '🔐 Hash Oluştur'}
              </button>

              {hashedPassword && (
                <div className="hash-result">
                  <h4>Hash Sonucu</h4>
                  <pre>{JSON.stringify(hashedPassword, null, 2)}</pre>
                  <button onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(hashedPassword));
                    showMessage('Hash panoya kopyalandı', 'success');
                  }}>
                    📋 Kopyala
                  </button>
                </div>
              )}
            </div>

            <div className="verify-section">
              <h3>Şifre Doğrulama</h3>
              <div className="form-group">
                <label>Şifre</label>
                <input
                  type="password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  placeholder="Doğrulanacak şifreyi girin..."
                />
              </div>
              <div className="form-group">
                <label>Hash Değeri (JSON)</label>
                <textarea
                  value={verifyHash}
                  onChange={(e) => setVerifyHash(e.target.value)}
                  placeholder='{"hash": "...", "salt": "...", "algorithm": "..."}'
                  rows="4"
                />
              </div>
              <button
                className="verify-button"
                onClick={verifyPasswordHash}
                disabled={loading}
              >
                {loading ? 'Doğrulanıyor...' : '✓ Doğrula'}
              </button>

              {passwordVerified !== null && (
                <div className={`verify-result ${passwordVerified ? 'success' : 'error'}`}>
                  {passwordVerified ? (
                    <>
                      <span className="icon">✓</span>
                      <span>Şifre doğru! Hash eşleşiyor.</span>
                    </>
                  ) : (
                    <>
                      <span className="icon">✗</span>
                      <span>Şifre yanlış! Hash eşleşmiyor.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="roles-tab">
            <div className="assign-role-section">
              <h3>Rol Atama</h3>
              <div className="form-group">
                <label>Kullanıcı</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Kullanıcı seçin...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Rol</label>
                <div className="roles-grid">
                  {roles.map(role => (
                    <label
                      key={role.value}
                      className={`role-option ${selectedRole === role.value ? 'selected' : ''}`}
                      style={{ borderColor: role.color }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={selectedRole === role.value}
                        onChange={(e) => setSelectedRole(e.target.value)}
                      />
                      <span style={{ color: role.color }}>{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                className="assign-button"
                onClick={assignRole}
                disabled={loading}
              >
                {loading ? 'Atanıyor...' : '👥 Rol Ata'}
              </button>
            </div>

            <div className="roles-info">
              <h3>Rol Açıklamaları</h3>
              <div className="role-cards">
                <div className="role-card" style={{ borderLeftColor: '#e74c3c' }}>
                  <h4>👑 Administrator</h4>
                  <p>Tam sistem erişimi ve yönetim yetkisi</p>
                  <ul>
                    <li>Tüm kullanıcıları yönetebilir</li>
                    <li>Sistem ayarlarını değiştirebilir</li>
                    <li>Tüm içeriği silebilir</li>
                    <li>API anahtarlarını yönetebilir</li>
                  </ul>
                </div>
                <div className="role-card" style={{ borderLeftColor: '#3498db' }}>
                  <h4>🛡️ Moderator</h4>
                  <p>İçerik moderasyonu ve kullanıcı yönetimi</p>
                  <ul>
                    <li>İçeriği düzenleyebilir</li>
                    <li>Kullanıcıları yönetebilir</li>
                    <li>Raporları inceleyebilir</li>
                    <li>Sınırlı silme yetkisi</li>
                  </ul>
                </div>
                <div className="role-card" style={{ borderLeftColor: '#2ecc71' }}>
                  <h4>👤 User</h4>
                  <p>Standart kullanıcı yetkileri</p>
                  <ul>
                    <li>Kendi içeriğini yönetebilir</li>
                    <li>Dosya yükleyebilir/indirebilir</li>
                    <li>İçeriği paylaşabilir</li>
                    <li>Profil ayarları yapabilir</li>
                  </ul>
                </div>
                <div className="role-card" style={{ borderLeftColor: '#95a5a6' }}>
                  <h4>🔍 Guest</h4>
                  <p>Sınırlı salt okuma erişimi</p>
                  <ul>
                    <li>Sadece genel içeriği görüntüleyebilir</li>
                    <li>İndirme sınırlı</li>
                    <li>Yükleme yapamaz</li>
                    <li>Paylaşım yapamaz</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === '2fa' && (
          <div className="twofa-tab">
            <div className="twofa-status">
              <h3>İki Faktörlü Kimlik Doğrulama (2FA)</h3>
              <div className={`status-badge ${twoFAEnabled ? 'enabled' : 'disabled'}`}>
                {twoFAEnabled ? '✓ Etkin' : '✗ Devre Dışı'}
              </div>
            </div>

            {!twoFAEnabled && !twoFASecret && (
              <div className="enable-2fa-section">
                <p>İki faktörlü kimlik doğrulama, hesabınıza ekstra bir güvenlik katmanı ekler.</p>
                <button
                  className="enable-button"
                  onClick={enableTwoFA}
                  disabled={loading}
                >
                  {loading ? 'Etkinleştiriliyor...' : '📱 2FA\'yı Etkinleştir'}
                </button>
              </div>
            )}

            {twoFASecret && !twoFAEnabled && (
              <div className="setup-2fa-section">
                <h4>2FA Kurulumu</h4>
                <p>Aşağıdaki gizli anahtarı authenticator uygulamanıza ekleyin:</p>
                <div className="secret-display">
                  <code>{twoFASecret}</code>
                  <button onClick={() => {
                    navigator.clipboard.writeText(twoFASecret);
                    showMessage('Gizli anahtar kopyalandı', 'success');
                  }}>
                    📋 Kopyala
                  </button>
                </div>
                <p>Ardından uygulamanızın ürettiği 6 haneli kodu girin:</p>
                <div className="verify-code">
                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    placeholder="000000"
                    maxLength="6"
                  />
                  <button
                    onClick={verifyTwoFA}
                    disabled={loading}
                  >
                    {loading ? 'Doğrulanıyor...' : '✓ Doğrula'}
                  </button>
                </div>
              </div>
            )}

            {twoFAEnabled && (
              <div className="disable-2fa-section">
                <p>2FA şu anda aktif. Hesabınız ek güvenlik ile korunuyor.</p>
                <button
                  className="disable-button"
                  onClick={disableTwoFA}
                  disabled={loading}
                >
                  {loading ? 'Devre Dışı Bırakılıyor...' : '🚫 2FA\'yı Devre Dışı Bırak'}
                </button>
              </div>
            )}

            <div className="twofa-info">
              <h4>ℹ️ 2FA Hakkında</h4>
              <ul>
                <li>Google Authenticator, Authy veya benzer uygulamalar kullanabilirsiniz</li>
                <li>Gizli anahtarınızı güvenli bir yerde saklayın</li>
                <li>Telefonunuzu kaybederseniz yedek kodları kullanın</li>
                <li>2FA her giriş için gerekli olacaktır</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-tab">
            <div className="sessions-header">
              <h3>Aktif Oturumlar ({activeSessions.length})</h3>
              <button
                className="new-session-button"
                onClick={createSession}
                disabled={loading}
              >
                {loading ? 'Oluşturuluyor...' : '➕ Yeni Oturum'}
              </button>
            </div>

            <div className="sessions-grid">
              {sessions.map(session => (
                <div
                  key={session.session_id}
                  className={`session-card ${!session.is_valid ? 'invalid' : ''}`}
                >
                  <div className="session-header">
                    <h4>🖥️ {session.device_info.substring(0, 50)}...</h4>
                    <span className={`session-status ${session.is_valid ? 'valid' : 'invalid'}`}>
                      {session.is_valid ? '✓ Aktif' : '✗ Sonlandı'}
                    </span>
                  </div>
                  <div className="session-info">
                    <p><strong>Oturum ID:</strong> {session.session_id}</p>
                    <p><strong>IP Adresi:</strong> {session.ip_address}</p>
                    <p><strong>Oluşturma:</strong> {formatDate(session.created_at)}</p>
                    <p><strong>Son Aktivite:</strong> {formatDate(session.last_activity)}</p>
                    <p><strong>Son Geçerlilik:</strong> {formatDate(session.expires_at)}</p>
                  </div>
                  {session.is_valid && (
                    <button
                      className="revoke-session-button"
                      onClick={() => revokeSession(session.session_id)}
                    >
                      🚫 Oturumu Sonlandır
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="audit-tab">
            <div className="audit-filters">
              <h3>Audit Logları ({auditLogs.length})</h3>
              <div className="filters-row">
                <select
                  value={auditFilter}
                  onChange={(e) => {
                    setAuditFilter(e.target.value);
                    setTimeout(loadAuditLogs, 100);
                  }}
                >
                  <option value="all">Tüm Eylemler</option>
                  <option value="login">Giriş</option>
                  <option value="logout">Çıkış</option>
                  <option value="api_key_created">API Anahtarı Oluşturma</option>
                  <option value="role_changed">Rol Değişikliği</option>
                  <option value="2fa_enabled">2FA Etkinleştirme</option>
                  <option value="encryption">Şifreleme</option>
                  <option value="decryption">Şifre Çözme</option>
                </select>
                <input
                  type="text"
                  value={auditUser}
                  onChange={(e) => setAuditUser(e.target.value)}
                  placeholder="Kullanıcı ID filtrele..."
                />
                <button onClick={loadAuditLogs}>🔍 Filtrele</button>
              </div>
            </div>

            <div className="audit-logs-list">
              {auditLogs.map(log => (
                <div key={log.log_id} className="audit-log-item">
                  <div className="log-icon">📋</div>
                  <div className="log-content">
                    <div className="log-header">
                      <span className="log-action">{log.action}</span>
                      <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="log-details">
                      <p><strong>Kullanıcı:</strong> {log.user_id}</p>
                      <p><strong>IP:</strong> {log.ip_address}</p>
                      {log.resource && <p><strong>Kaynak:</strong> {log.resource}</p>}
                      {log.details && (
                        <details>
                          <summary>Detaylar</summary>
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className={`log-status ${log.success ? 'success' : 'error'}`}>
                    {log.success ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && statistics && (
          <div className="stats-tab">
            <h3>Güvenlik İstatistikleri</h3>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🔑</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_api_keys}</div>
                  <div className="stat-label">Toplam API Anahtarı</div>
                  <div className="stat-sub">
                    {statistics.active_api_keys} aktif, {statistics.total_api_keys - statistics.active_api_keys} iptal edildi
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🖥️</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.active_sessions}</div>
                  <div className="stat-label">Aktif Oturum</div>
                  <div className="stat-sub">
                    {statistics.total_sessions} toplam oturum
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔒</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.encryption_operations}</div>
                  <div className="stat-label">Şifreleme İşlemi</div>
                  <div className="stat-sub">
                    {formatBytes(statistics.encrypted_data_size)} şifrelenmiş
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_audit_logs}</div>
                  <div className="stat-label">Audit Log</div>
                  <div className="stat-sub">
                    {statistics.failed_attempts} başarısız deneme
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.users_with_2fa}</div>
                  <div className="stat-label">2FA Kullanan</div>
                  <div className="stat-sub">
                    Toplam kullanıcıların %{Math.round((statistics.users_with_2fa / Math.max(statistics.total_sessions, 1)) * 100)}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.failed_attempts}</div>
                  <div className="stat-label">Başarısız Deneme</div>
                  <div className="stat-sub">
                    Son 24 saat
                  </div>
                </div>
              </div>
            </div>

            <div className="role-distribution">
              <h4>Rol Dağılımı</h4>
              <div className="distribution-chart">
                {Object.entries(statistics.roles_distribution).map(([role, count]) => (
                  <div key={role} className="distribution-item">
                    <div className="distribution-label">{role}</div>
                    <div className="distribution-bar">
                      <div
                        className="distribution-fill"
                        style={{
                          width: `${(count / Math.max(...Object.values(statistics.roles_distribution))) * 100}%`,
                          backgroundColor: roles.find(r => r.value === role)?.color || '#95a5a6'
                        }}
                      >
                        <span>{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="last-updated">
              Son güncelleme: {new Date().toLocaleString('tr-TR')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityManager;
