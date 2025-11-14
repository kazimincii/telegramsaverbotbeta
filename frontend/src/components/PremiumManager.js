import React, { useState, useEffect } from 'react';
import './PremiumManager.css';

const PremiumManager = () => {
  const [activeTab, setActiveTab] = useState('subscription');
  const [currentUser] = useState('user123'); // Mock user ID
  const [subscription, setSubscription] = useState(null);
  const [tiers, setTiers] = useState(null);
  const [transcriptions, setTranscriptions] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // Voice transcription state
  const [voiceFile, setVoiceFile] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [transcribing, setTranscribing] = useState(false);

  // File validation state
  const [fileSize, setFileSize] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    loadSubscription();
    loadTiers();
    loadTranscriptions();
    loadUsageStats();
    loadStatistics();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/premium/subscriptions/${currentUser}`);
      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const loadTiers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/premium/tiers');
      const data = await response.json();
      if (data.success) {
        setTiers(data.tiers);
      }
    } catch (error) {
      console.error('Error loading tiers:', error);
    }
  };

  const loadTranscriptions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/premium/transcriptions');
      const data = await response.json();
      if (data.success) {
        setTranscriptions(data.transcriptions);
      }
    } catch (error) {
      console.error('Error loading transcriptions:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/premium/usage/${currentUser}`);
      const data = await response.json();
      if (data.success) {
        setUsageStats(data.statistics);
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/premium/statistics');
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleUpgrade = async (tier) => {
    if (!subscription || subscription.tier === tier) return;

    try {
      const response = await fetch('http://localhost:5000/api/premium/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser,
          new_tier: tier
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
        alert('Subscription upgraded successfully!');
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription');
    }
  };

  const handleSubscribe = async (tier) => {
    try {
      const response = await fetch('http://localhost:5000/api/premium/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser,
          tier: tier,
          duration_days: 30,
          payment_method: 'credit_card',
          auto_renew: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
        alert('Subscription created successfully!');
      } else {
        alert(data.error || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/premium/subscriptions/${currentUser}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadSubscription();
        alert('Subscription cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  const handleTranscribeVoice = async () => {
    if (!voiceFile) {
      alert('Please enter a voice file path');
      return;
    }

    setTranscribing(true);
    setTranscriptionResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/premium/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: voiceFile,
          language: voiceLanguage,
          user_id: currentUser
        })
      });

      const data = await response.json();
      if (data.success) {
        setTranscriptionResult(data.transcription);
        loadTranscriptions();
        loadUsageStats();
      } else {
        alert(data.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Error transcribing voice:', error);
      alert('Failed to transcribe voice message');
    } finally {
      setTranscribing(false);
    }
  };

  const handleValidateFileSize = async () => {
    if (!fileSize) {
      alert('Please enter a file size');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/premium/validate-file-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser,
          file_size_mb: parseInt(fileSize)
        })
      });

      const data = await response.json();
      if (data.success) {
        setValidationResult(data);
      }
    } catch (error) {
      console.error('Error validating file size:', error);
    }
  };

  const getTierBadge = (tier) => {
    const badges = {
      free: { icon: '🆓', color: '#999' },
      premium: { icon: '⭐', color: '#667eea' },
      business: { icon: '💼', color: '#f093fb' },
      enterprise: { icon: '🏢', color: '#764ba2' }
    };
    return badges[tier] || badges.free;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderSubscriptionTab = () => (
    <div className="subscription-section">
      {/* Current Subscription */}
      {subscription && (
        <div className="current-subscription">
          <h3>Mevcut Aboneliğiniz</h3>
          <div className="subscription-card current">
            <div className="subscription-header">
              <span className="tier-badge" style={{ background: getTierBadge(subscription.tier).color }}>
                {getTierBadge(subscription.tier).icon} {subscription.tier.toUpperCase()}
              </span>
              <span className={`status-badge ${subscription.status}`}>
                {subscription.status}
              </span>
            </div>

            {subscription.start_date && (
              <div className="subscription-dates">
                <div className="date-item">
                  <span className="label">Başlangıç:</span>
                  <span className="value">{formatDate(subscription.start_date)}</span>
                </div>
                <div className="date-item">
                  <span className="label">Bitiş:</span>
                  <span className="value">{formatDate(subscription.end_date)}</span>
                </div>
              </div>
            )}

            {subscription.features && subscription.features.length > 0 && (
              <div className="features-list">
                <h4>Özellikler:</h4>
                <ul>
                  {subscription.features.map((feature, index) => (
                    <li key={index}>
                      <span className="feature-icon">✓</span>
                      {feature.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {subscription.status === 'active' && subscription.tier !== 'free' && (
              <button
                className="btn-secondary btn-cancel"
                onClick={handleCancelSubscription}
              >
                İptal Et
              </button>
            )}
          </div>
        </div>
      )}

      {/* Available Tiers */}
      <div className="available-tiers">
        <h3>Abonelik Paketleri</h3>
        <div className="tiers-grid">
          {tiers && Object.entries(tiers).map(([tierKey, tierData]) => {
            const badge = getTierBadge(tierKey);
            const isCurrentTier = subscription && subscription.tier === tierKey;

            return (
              <div key={tierKey} className={`tier-card ${isCurrentTier ? 'current' : ''}`}>
                <div className="tier-header">
                  <span className="tier-icon">{badge.icon}</span>
                  <h4>{tierData.tier.toUpperCase()}</h4>
                </div>

                <div className="tier-limits">
                  <div className="limit-item">
                    <span className="limit-icon">📁</span>
                    <div className="limit-info">
                      <span className="limit-label">Max File Size</span>
                      <span className="limit-value">
                        {tierData.max_file_size_mb === -1 ? 'Unlimited' : `${tierData.max_file_size_mb} MB`}
                      </span>
                    </div>
                  </div>

                  <div className="limit-item">
                    <span className="limit-icon">💾</span>
                    <div className="limit-info">
                      <span className="limit-label">Storage</span>
                      <span className="limit-value">
                        {tierData.max_storage_gb === -1 ? 'Unlimited' : `${tierData.max_storage_gb} GB`}
                      </span>
                    </div>
                  </div>

                  <div className="limit-item">
                    <span className="limit-icon">⬇️</span>
                    <div className="limit-info">
                      <span className="limit-label">Downloads/Day</span>
                      <span className="limit-value">
                        {tierData.max_downloads_per_day === -1 ? 'Unlimited' : tierData.max_downloads_per_day}
                      </span>
                    </div>
                  </div>

                  <div className="limit-item">
                    <span className="limit-icon">🎤</span>
                    <div className="limit-info">
                      <span className="limit-label">Voice Transcriptions/Day</span>
                      <span className="limit-value">
                        {tierData.max_voice_transcriptions_per_day === -1 ? 'Unlimited' : tierData.max_voice_transcriptions_per_day}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tier-features">
                  {tierData.features.slice(0, 5).map((feature, index) => (
                    <div key={index} className="feature-item">
                      <span className="feature-check">✓</span>
                      <span>{feature.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                  {tierData.features.length > 5 && (
                    <div className="feature-item">
                      <span>+{tierData.features.length - 5} more...</span>
                    </div>
                  )}
                </div>

                {!isCurrentTier && (
                  <button
                    className="btn-primary"
                    onClick={() => subscription && subscription.tier !== 'free'
                      ? handleUpgrade(tierKey)
                      : handleSubscribe(tierKey)}
                    style={{ background: badge.color }}
                  >
                    {subscription && subscription.tier !== 'free' ? 'Yükselt' : 'Abone Ol'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderTranscriptionTab = () => (
    <div className="transcription-section">
      <div className="section-header">
        <h3>Sesli Mesaj Transkripsiyon</h3>
      </div>

      {/* Transcription Form */}
      <div className="transcription-form">
        <div className="form-card">
          <h4>Yeni Transkripsiyon</h4>

          <div className="form-group">
            <label>Ses Dosyası Yolu:</label>
            <input
              type="text"
              value={voiceFile}
              onChange={(e) => setVoiceFile(e.target.value)}
              placeholder="/path/to/voice/message.ogg"
            />
          </div>

          <div className="form-group">
            <label>Dil:</label>
            <select value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)}>
              <option value="en-US">English (US)</option>
              <option value="tr-TR">Türkçe</option>
              <option value="de-DE">Deutsch</option>
              <option value="fr-FR">Français</option>
              <option value="es-ES">Español</option>
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={handleTranscribeVoice}
            disabled={transcribing}
          >
            {transcribing ? 'Transkribe Ediliyor...' : 'Transkribe Et'}
          </button>
        </div>

        {/* Transcription Result */}
        {transcriptionResult && (
          <div className="transcription-result">
            <h4>Transkripsiyon Sonucu</h4>
            <div className="result-meta">
              <span>Süre: {transcriptionResult.duration}s</span>
              <span>Dil: {transcriptionResult.language}</span>
              <span>Güven: {(transcriptionResult.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="result-text">
              <pre>{transcriptionResult.transcribed_text}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Transcription History */}
      <div className="transcription-history">
        <h4>Transkripsiyon Geçmişi</h4>
        <div className="history-grid">
          {transcriptions.map((trans) => (
            <div key={trans.id} className="history-card">
              <div className="history-header">
                <span className="history-icon">🎤</span>
                <div className="history-info">
                  <span className="history-lang">{trans.language}</span>
                  <span className="history-date">{formatDate(trans.created_at)}</span>
                </div>
              </div>
              <div className="history-meta">
                <span>⏱️ {trans.duration}s</span>
                <span>📊 {(trans.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="history-text">
                {trans.transcribed_text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeaturesTab = () => (
    <div className="features-section">
      <div className="section-header">
        <h3>Premium Özellikler</h3>
      </div>

      {/* File Size Validator */}
      <div className="feature-tool">
        <h4>Dosya Boyutu Doğrulayıcı</h4>
        <p>İndirebileceğiniz maksimum dosya boyutunu kontrol edin.</p>

        <div className="tool-form">
          <div className="form-group">
            <label>Dosya Boyutu (MB):</label>
            <input
              type="number"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              placeholder="örn: 2048"
            />
          </div>

          <button className="btn-primary" onClick={handleValidateFileSize}>
            Doğrula
          </button>
        </div>

        {validationResult && (
          <div className={`validation-result ${validationResult.allowed ? 'success' : 'error'}`}>
            <div className="result-icon">
              {validationResult.allowed ? '✅' : '❌'}
            </div>
            <div className="result-message">
              {validationResult.allowed ? (
                <span>Bu dosya boyutu destekleniyor!</span>
              ) : (
                <span>
                  Dosya çok büyük! Maksimum: {validationResult.max_size_mb} MB
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Premium Features List */}
      <div className="premium-features-list">
        <h4>Tüm Premium Özellikler</h4>
        <div className="features-grid">
          <div className="feature-box">
            <span className="feature-icon">📁</span>
            <h5>Büyük Dosyalar</h5>
            <p>4GB'a kadar dosya indirin</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">⚡</span>
            <h5>Öncelikli İndirmeler</h5>
            <p>Daha hızlı indirme hızları</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">🎤</span>
            <h5>Sesli Transkripsiyon</h5>
            <p>Sesli mesajları metne çevirin</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">💾</span>
            <h5>Sınırsız Depolama</h5>
            <p>Depolama limiti yok</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">🔍</span>
            <h5>Gelişmiş Arama</h5>
            <p>Güçlü arama yetenekleri</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">🎨</span>
            <h5>Özel Temalar</h5>
            <p>Premium temalar</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">🚫</span>
            <h5>Reklamsız</h5>
            <p>Reklamsız deneyim</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">🛟</span>
            <h5>Premium Destek</h5>
            <p>Öncelikli müşteri desteği</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">⚙️</span>
            <h5>Toplu İşlemler</h5>
            <p>Toplu dosya işlemleri</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">🔌</span>
            <h5>API Erişimi</h5>
            <p>Geliştiriciler için API</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">👥</span>
            <h5>Takım İşbirliği</h5>
            <p>Takım özellikleri</p>
          </div>

          <div className="feature-box">
            <span className="feature-icon">📊</span>
            <h5>Gelişmiş Analitik</h5>
            <p>Detaylı istatistikler</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatisticsTab = () => (
    <div className="statistics-section">
      <div className="section-header">
        <h3>İstatistikler</h3>
      </div>

      {/* Usage Statistics */}
      {usageStats && (
        <div className="usage-stats">
          <h4>Kullanım İstatistikleriniz</h4>
          <div className="stats-grid">
            {Object.entries(usageStats).map(([feature, data]) => (
              <div key={feature} className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <span className="stat-label">{feature.replace(/_/g, ' ')}</span>
                  <span className="stat-value">{data.count}</span>
                  <span className="stat-date">Son: {formatDate(data.last_used)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Statistics */}
      {statistics && (
        <div className="global-stats">
          <h4>Genel İstatistikler</h4>

          <div className="overview-cards">
            <div className="overview-card">
              <div className="overview-icon">👥</div>
              <div className="overview-content">
                <span className="overview-value">{statistics.total_subscribers}</span>
                <span className="overview-label">Toplam Abone</span>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon">✅</div>
              <div className="overview-content">
                <span className="overview-value">{statistics.active_subscribers}</span>
                <span className="overview-label">Aktif Abone</span>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon">🎤</div>
              <div className="overview-content">
                <span className="overview-value">{statistics.total_transcriptions}</span>
                <span className="overview-label">Transkripsiyon</span>
              </div>
            </div>
          </div>

          {/* Subscribers by Tier */}
          {statistics.subscribers_by_tier && (
            <div className="tier-distribution">
              <h5>Paketlere Göre Dağılım</h5>
              <div className="distribution-bars">
                {Object.entries(statistics.subscribers_by_tier).map(([tier, count]) => {
                  const badge = getTierBadge(tier);
                  const percentage = (count / statistics.total_subscribers) * 100;

                  return (
                    <div key={tier} className="distribution-item">
                      <div className="distribution-label">
                        <span>{badge.icon} {tier}</span>
                        <span>{count} abone</span>
                      </div>
                      <div className="distribution-bar">
                        <div
                          className="distribution-fill"
                          style={{
                            width: `${percentage}%`,
                            background: badge.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feature Usage */}
          {statistics.feature_usage && (
            <div className="feature-usage">
              <h5>Özellik Kullanımı</h5>
              <div className="usage-grid">
                {Object.entries(statistics.feature_usage).map(([feature, count]) => (
                  <div key={feature} className="usage-item">
                    <span className="usage-feature">{feature.replace(/_/g, ' ')}</span>
                    <span className="usage-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="premium-manager">
      {/* Header */}
      <div className="premium-header">
        <h2>💎 Telegram Premium</h2>
        <p>Premium özellikleri keşfedin ve aboneliğinizi yönetin</p>
      </div>

      {/* Tabs */}
      <div className="premium-tabs">
        <button
          className={`tab-button ${activeTab === 'subscription' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscription')}
        >
          <span className="tab-icon">💳</span>
          Abonelik
        </button>

        <button
          className={`tab-button ${activeTab === 'transcription' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcription')}
        >
          <span className="tab-icon">🎤</span>
          Transkripsiyon
        </button>

        <button
          className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          <span className="tab-icon">✨</span>
          Özellikler
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
      <div className="premium-content">
        {activeTab === 'subscription' && renderSubscriptionTab()}
        {activeTab === 'transcription' && renderTranscriptionTab()}
        {activeTab === 'features' && renderFeaturesTab()}
        {activeTab === 'statistics' && renderStatisticsTab()}
      </div>
    </div>
  );
};

export default PremiumManager;
