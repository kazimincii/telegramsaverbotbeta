import React, { useState, useEffect } from 'react';
import './PluginManager.css';

const PluginManager = () => {
  const [activeTab, setActiveTab] = useState('installed');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [plugins, setPlugins] = useState([]);
  const [marketplace, setMarketplace] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadPlugins();
    loadMarketplace();
    loadHooks();
    loadStatistics();
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const loadPlugins = async () => {
    try {
      const response = await fetch('/api/plugins');
      const data = await response.json();
      if (data.success) setPlugins(data.plugins);
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  };

  const loadMarketplace = async () => {
    try {
      const response = await fetch('/api/plugins/marketplace');
      const data = await response.json();
      if (data.success) setMarketplace(data.listings);
    } catch (error) {
      console.error('Error loading marketplace:', error);
    }
  };

  const loadHooks = async () => {
    try {
      const response = await fetch('/api/plugins/hooks');
      const data = await response.json();
      if (data.success) setHooks(data.hooks);
    } catch (error) {
      console.error('Error loading hooks:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/plugins/statistics');
      const data = await response.json();
      if (data.success) setStatistics(data.statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const installPlugin = async (listing) => {
    setLoading(true);
    try {
      const manifest = {
        plugin_id: listing.plugin_id,
        name: listing.name,
        version: listing.version,
        description: listing.description,
        author: listing.author,
        category: listing.category,
        min_version: '1.0.0',
        dependencies: [],
        permissions: ['read', 'write'],
        homepage: null,
        repository: null,
        icon_url: null,
        main_file: 'main.js',
        config_schema: {},
        tags: listing.tags
      };

      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest, user_id: 'current_user', config: {} })
      });

      const data = await response.json();
      if (data.success) {
        await loadPlugins();
        showMessage('Plugin başarıyla yüklendi!', 'success');
      } else {
        showMessage(data.error || 'Plugin yüklenemedi', 'error');
      }
    } catch (error) {
      showMessage('Plugin yükleme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const enablePlugin = async (pluginId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/plugins/${pluginId}/enable?user_id=current_user`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await loadPlugins();
        showMessage('Plugin etkinleştirildi!', 'success');
      } else {
        showMessage(data.error || 'Plugin etkinleştirilemedi', 'error');
      }
    } catch (error) {
      showMessage('Etkinleştirme hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const disablePlugin = async (pluginId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/plugins/${pluginId}/disable?user_id=current_user`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await loadPlugins();
        showMessage('Plugin devre dışı bırakıldı', 'success');
      } else {
        showMessage(data.error || 'Plugin devre dışı bırakılamadı', 'error');
      }
    } catch (error) {
      showMessage('Devre dışı bırakma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const uninstallPlugin = async (pluginId) => {
    if (!window.confirm('Bu plugini kaldırmak istediğinizden emin misiniz?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/plugins/${pluginId}/uninstall?user_id=current_user`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        await loadPlugins();
        showMessage('Plugin kaldırıldı', 'success');
      } else {
        showMessage(data.error || 'Plugin kaldırılamadı', 'error');
      }
    } catch (error) {
      showMessage('Kaldırma hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#27ae60',
      inactive: '#95a5a6',
      disabled: '#e74c3c',
      error: '#e74c3c',
      updating: '#f39c12'
    };
    return colors[status] || '#95a5a6';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      utility: '🛠️',
      media: '🎬',
      automation: '⚙️',
      integration: '🔗',
      ui: '🎨',
      analytics: '📊',
      security: '🔐',
      custom: '🧩'
    };
    return icons[category] || '🧩';
  };

  return (
    <div className="plugin-manager">
      <div className="plugin-header">
        <h2>🔌 Plugin Yöneticisi</h2>
        <p>Özel eklentiler ve uzantılarla işlevsellik genişletin</p>
      </div>

      {message.text && (
        <div className={`plugin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="plugin-tabs">
        <button
          className={activeTab === 'installed' ? 'active' : ''}
          onClick={() => setActiveTab('installed')}
        >
          📦 Yüklü Pluginler
        </button>
        <button
          className={activeTab === 'marketplace' ? 'active' : ''}
          onClick={() => setActiveTab('marketplace')}
        >
          🛒 Marketplace
        </button>
        <button
          className={activeTab === 'hooks' ? 'active' : ''}
          onClick={() => setActiveTab('hooks')}
        >
          🪝 Hooks
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          📊 İstatistikler
        </button>
      </div>

      <div className="plugin-content">
        {activeTab === 'installed' && (
          <div className="installed-tab">
            <h3>Yüklü Pluginler ({plugins.length})</h3>
            <div className="plugins-grid">
              {plugins.map(plugin => (
                <div key={plugin.plugin_id} className="plugin-card">
                  <div className="plugin-card-header">
                    <div className="plugin-icon">{getCategoryIcon(plugin.manifest.category)}</div>
                    <div className="plugin-title">
                      <h4>{plugin.manifest.name}</h4>
                      <span className="plugin-version">v{plugin.manifest.version}</span>
                    </div>
                    <span
                      className="plugin-status-badge"
                      style={{ backgroundColor: getStatusColor(plugin.status) }}
                    >
                      {plugin.enabled ? 'Aktif' : 'Devre Dışı'}
                    </span>
                  </div>
                  <p className="plugin-description">{plugin.manifest.description}</p>
                  <div className="plugin-meta">
                    <span>👤 {plugin.manifest.author}</span>
                    <span>📂 {plugin.manifest.category}</span>
                    <span>🔌 {plugin.api_calls_count} API çağrısı</span>
                  </div>
                  <div className="plugin-actions">
                    {plugin.enabled ? (
                      <button
                        className="btn-disable"
                        onClick={() => disablePlugin(plugin.plugin_id)}
                        disabled={loading}
                      >
                        ⏸️ Devre Dışı Bırak
                      </button>
                    ) : (
                      <button
                        className="btn-enable"
                        onClick={() => enablePlugin(plugin.plugin_id)}
                        disabled={loading}
                      >
                        ▶️ Etkinleştir
                      </button>
                    )}
                    <button
                      className="btn-uninstall"
                      onClick={() => uninstallPlugin(plugin.plugin_id)}
                      disabled={loading}
                    >
                      🗑️ Kaldır
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="marketplace-tab">
            <h3>Plugin Marketplace ({marketplace.length})</h3>
            <div className="marketplace-grid">
              {marketplace.map(listing => (
                <div key={listing.listing_id} className="marketplace-card">
                  <div className="marketplace-card-header">
                    <div className="plugin-icon">{getCategoryIcon(listing.category)}</div>
                    <div className="plugin-title">
                      <h4>{listing.name}</h4>
                      <span className="plugin-version">v{listing.version}</span>
                    </div>
                    {listing.featured && <span className="featured-badge">⭐ Öne Çıkan</span>}
                  </div>
                  <p className="plugin-description">{listing.description}</p>
                  <div className="plugin-meta">
                    <span>👤 {listing.author}</span>
                    <span>⭐ {listing.rating.toFixed(1)}</span>
                    <span>📥 {listing.downloads.toLocaleString()}</span>
                  </div>
                  <div className="plugin-pricing">
                    {listing.is_free ? (
                      <span className="price-free">🆓 Ücretsiz</span>
                    ) : (
                      <span className="price-paid">${listing.price}</span>
                    )}
                  </div>
                  <button
                    className="btn-install"
                    onClick={() => installPlugin(listing)}
                    disabled={loading || plugins.some(p => p.manifest.name === listing.name)}
                  >
                    {plugins.some(p => p.manifest.name === listing.name) ? '✓ Yüklü' : '📥 Yükle'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hooks' && (
          <div className="hooks-tab">
            <h3>Sistem Hooks ({hooks.length})</h3>
            <div className="hooks-list">
              {hooks.map(hook => (
                <div key={hook.hook_id} className="hook-card">
                  <div className="hook-header">
                    <h4>🪝 {hook.hook_name}</h4>
                    <span className="hook-type">{hook.hook_type}</span>
                  </div>
                  <p>{hook.description}</p>
                  <div className="hook-info">
                    <span>📌 Kayıtlı Pluginler: {hook.registered_plugins.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && statistics && (
          <div className="stats-tab">
            <h3>Plugin İstatistikleri</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_plugins}</div>
                  <div className="stat-label">Toplam Plugin</div>
                  <div className="stat-sub">{statistics.active_plugins} aktif</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🪝</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_hooks}</div>
                  <div className="stat-label">Sistem Hooks</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔌</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.total_api_calls}</div>
                  <div className="stat-label">API Çağrıları</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🛒</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.marketplace_listings}</div>
                  <div className="stat-label">Marketplace</div>
                </div>
              </div>
            </div>

            {statistics.category_distribution && (
              <div className="distribution-section">
                <h4>Kategori Dağılımı</h4>
                <div className="distribution-chart">
                  {Object.entries(statistics.category_distribution).map(([category, count]) => (
                    <div key={category} className="distribution-item">
                      <div className="distribution-label">
                        {getCategoryIcon(category)} {category}
                      </div>
                      <div className="distribution-bar">
                        <div
                          className="distribution-fill"
                          style={{ width: `${(count / statistics.total_plugins) * 100}%` }}
                        >
                          <span>{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginManager;
