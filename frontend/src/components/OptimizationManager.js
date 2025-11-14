import React, { useState, useEffect } from 'react';
import './OptimizationManager.css';

const OptimizationManager = () => {
  const [activeTab, setActiveTab] = useState('caches');
  const [caches, setCaches] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cache creation state
  const [newCache, setNewCache] = useState({
    name: '',
    max_size_mb: 512,
    strategy: 'lru',
    default_ttl: 300
  });

  // Cache entry state
  const [cacheEntry, setCacheEntry] = useState({
    cache_id: '',
    key: '',
    value: '',
    ttl: ''
  });

  // Cache get state
  const [cacheGet, setCacheGet] = useState({
    cache_id: '',
    key: ''
  });
  const [cacheResult, setCacheResult] = useState(null);

  // Query optimization state
  const [queryOpt, setQueryOpt] = useState({
    query: '',
    table: ''
  });
  const [queryResult, setQueryResult] = useState(null);

  // Asset compression state
  const [assetComp, setAssetComp] = useState({
    file_path: '',
    compression_type: 'gzip'
  });
  const [compressionResult, setCompressionResult] = useState(null);

  // Lazy load config state
  const [lazyLoadConfig, setLazyLoadConfig] = useState({
    resource_type: 'images',
    threshold: 200,
    placeholder: '/placeholder.jpg'
  });

  useEffect(() => {
    loadCaches();
    loadPerformanceMetrics();

    const interval = setInterval(() => {
      loadPerformanceMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadCaches = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/optimization/caches');
      if (response.ok) {
        const data = await response.json();
        setCaches(data.caches || []);
      }
    } catch (error) {
      console.error('Failed to load caches:', error);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/optimization/metrics');
      if (response.ok) {
        const data = await response.json();
        setPerformanceMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const createCache = async () => {
    if (!newCache.name) {
      alert('Lütfen cache adı girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/optimization/caches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCache)
      });

      if (response.ok) {
        alert('Cache oluşturuldu!');
        setNewCache({
          name: '',
          max_size_mb: 512,
          strategy: 'lru',
          default_ttl: 300
        });
        loadCaches();
      }
    } catch (error) {
      console.error('Failed to create cache:', error);
      alert('Cache oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const setCacheValue = async () => {
    if (!cacheEntry.cache_id || !cacheEntry.key || !cacheEntry.value) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/optimization/caches/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cache_id: cacheEntry.cache_id,
          key: cacheEntry.key,
          value: cacheEntry.value,
          ttl: cacheEntry.ttl ? parseInt(cacheEntry.ttl) : null
        })
      });

      if (response.ok) {
        alert('Cache değeri kaydedildi!');
        setCacheEntry({
          cache_id: cacheEntry.cache_id,
          key: '',
          value: '',
          ttl: ''
        });
      }
    } catch (error) {
      console.error('Failed to set cache:', error);
      alert('Cache değeri kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const getCacheValue = async () => {
    if (!cacheGet.cache_id || !cacheGet.key) {
      alert('Lütfen cache ID ve key girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/optimization/caches/${cacheGet.cache_id}/get?key=${encodeURIComponent(cacheGet.key)}`
      );

      if (response.ok) {
        const data = await response.json();
        setCacheResult(data);
      }
    } catch (error) {
      console.error('Failed to get cache:', error);
      setCacheResult({ success: false, error: 'İstek başarısız oldu' });
    } finally {
      setLoading(false);
    }
  };

  const invalidateCache = async (cacheId, key = null) => {
    setLoading(true);
    try {
      const url = key
        ? `http://localhost:8000/api/optimization/caches/${cacheId}/invalidate?key=${encodeURIComponent(key)}`
        : `http://localhost:8000/api/optimization/caches/${cacheId}/invalidate`;

      const response = await fetch(url, { method: 'POST' });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.invalidated} cache entry silindi`);
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCacheStats = async (cacheId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/optimization/caches/${cacheId}/stats`);
      if (response.ok) {
        const data = await response.json();
        const stats = data.stats;
        alert(
          `Cache İstatistikleri:\n\n` +
          `Hit Rate: ${(stats.hit_rate * 100).toFixed(1)}%\n` +
          `Hits: ${stats.hits}\n` +
          `Misses: ${stats.misses}\n` +
          `Entries: ${stats.entries}\n` +
          `Size: ${stats.total_size_mb} MB / ${stats.max_size_mb} MB\n` +
          `Usage: ${stats.usage_percent}%`
        );
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  };

  const optimizeQuery = async () => {
    if (!queryOpt.query || !queryOpt.table) {
      alert('Lütfen query ve tablo adı girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/optimization/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryOpt)
      });

      if (response.ok) {
        const data = await response.json();
        setQueryResult(data.optimization);
      }
    } catch (error) {
      console.error('Failed to optimize query:', error);
      alert('Query optimize edilemedi');
    } finally {
      setLoading(false);
    }
  };

  const compressAsset = async () => {
    if (!assetComp.file_path) {
      alert('Lütfen dosya yolu girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/optimization/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetComp)
      });

      if (response.ok) {
        const data = await response.json();
        setCompressionResult(data);
        alert(`Asset sıkıştırıldı!\n${data.saved_percent}% yer tasarrufu (${(data.saved_bytes / 1024).toFixed(2)} KB)`);
      }
    } catch (error) {
      console.error('Failed to compress asset:', error);
      alert('Asset sıkıştırılamadı');
    } finally {
      setLoading(false);
    }
  };

  const configureLazyLoad = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/optimization/lazy-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lazyLoadConfig)
      });

      if (response.ok) {
        alert('Lazy loading yapılandırması kaydedildi!');
      }
    } catch (error) {
      console.error('Failed to configure lazy load:', error);
      alert('Lazy loading yapılandırılamadı');
    } finally {
      setLoading(false);
    }
  };

  const getStrategyDescription = (strategy) => {
    const descriptions = {
      lru: 'En uzun süredir kullanılmayan önce silinir',
      lfu: 'En az kullanılan önce silinir',
      fifo: 'İlk giren ilk çıkar',
      ttl: 'Süre dolunca otomatik silinir'
    };
    return descriptions[strategy] || strategy;
  };

  return (
    <div className="optimization-manager-container">
      <div className="optimization-manager-header">
        <h1 className="optimization-manager-title">⚡ Performance Optimization & Caching</h1>
        <p className="optimization-manager-subtitle">Cache yönetimi, query optimizasyonu ve asset sıkıştırma</p>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="metrics-overview">
          <div className="metrics-section">
            <h3>💾 Caching</h3>
            <div className="metric-item">
              <span className="metric-label">Total Caches:</span>
              <span className="metric-value">{performanceMetrics.caching.total_caches}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Hits:</span>
              <span className="metric-value">{performanceMetrics.caching.total_hits.toLocaleString()}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Hit Rate:</span>
              <span className="metric-value highlight">
                {(performanceMetrics.caching.average_hit_rate * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="metrics-section">
            <h3>🗜️ Compression</h3>
            <div className="metric-item">
              <span className="metric-label">Assets Compressed:</span>
              <span className="metric-value">{performanceMetrics.compression.total_assets}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Space Saved:</span>
              <span className="metric-value highlight">
                {performanceMetrics.compression.total_saved_mb} MB
              </span>
            </div>
          </div>

          <div className="metrics-section">
            <h3>🚀 Optimization</h3>
            <div className="metric-item">
              <span className="metric-label">Queries Optimized:</span>
              <span className="metric-value">{performanceMetrics.optimization.queries_optimized}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Lazy Load Configs:</span>
              <span className="metric-value">{performanceMetrics.optimization.lazy_load_configs}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="optimization-tabs">
        <button
          className={`optimization-tab ${activeTab === 'caches' ? 'active' : ''}`}
          onClick={() => setActiveTab('caches')}
        >
          💾 Cache Yönetimi
        </button>
        <button
          className={`optimization-tab ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          🔍 Query Optimizasyonu
        </button>
        <button
          className={`optimization-tab ${activeTab === 'compression' ? 'active' : ''}`}
          onClick={() => setActiveTab('compression')}
        >
          🗜️ Asset Sıkıştırma
        </button>
        <button
          className={`optimization-tab ${activeTab === 'lazy-load' ? 'active' : ''}`}
          onClick={() => setActiveTab('lazy-load')}
        >
          ⏳ Lazy Loading
        </button>
      </div>

      {/* Caches Tab */}
      {activeTab === 'caches' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* Cache List */}
            <div className="panel panel-wide">
              <h2>Yapılandırılmış Cache'ler ({caches.length})</h2>

              {caches.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz cache oluşturulmamış</p>
                </div>
              ) : (
                <div className="caches-grid">
                  {caches.map(cache => (
                    <div key={cache.cache_id} className="cache-card">
                      <div className="cache-header">
                        <h3>{cache.name}</h3>
                        {cache.enabled ? (
                          <span className="badge badge-success">Aktif</span>
                        ) : (
                          <span className="badge badge-disabled">Pasif</span>
                        )}
                      </div>

                      <div className="cache-info">
                        <div className="cache-stat">
                          <span className="cache-stat-label">Strategy:</span>
                          <span className="cache-stat-value">{cache.strategy.toUpperCase()}</span>
                        </div>
                        <div className="cache-stat">
                          <span className="cache-stat-label">Max Size:</span>
                          <span className="cache-stat-value">{cache.max_size_mb} MB</span>
                        </div>
                        <div className="cache-stat">
                          <span className="cache-stat-label">Default TTL:</span>
                          <span className="cache-stat-value">{cache.default_ttl}s</span>
                        </div>
                      </div>

                      {cache.stats && (
                        <div className="cache-stats">
                          <div className="hit-rate">
                            Hit Rate: <strong>{(cache.stats.hit_rate * 100).toFixed(1)}%</strong>
                          </div>
                          <div className="hits-misses">
                            Hits: {cache.stats.hits.toLocaleString()} | Misses: {cache.stats.misses.toLocaleString()}
                          </div>
                        </div>
                      )}

                      <div className="cache-actions">
                        <button
                          className="btn-small btn-primary"
                          onClick={() => getCacheStats(cache.cache_id)}
                        >
                          📊 İstatistikler
                        </button>
                        <button
                          className="btn-small btn-secondary"
                          onClick={() => invalidateCache(cache.cache_id)}
                        >
                          🗑️ Clear All
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cache Operations */}
            <div className="panel">
              <h2>Cache İşlemleri</h2>

              <div className="sub-section">
                <h3>Yeni Cache Oluştur</h3>

                <div className="form-group">
                  <label>Cache Adı *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCache.name}
                    onChange={(e) => setNewCache({...newCache, name: e.target.value})}
                    placeholder="User Session Cache"
                  />
                </div>

                <div className="form-group">
                  <label>Maksimum Boyut (MB)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newCache.max_size_mb}
                    onChange={(e) => setNewCache({...newCache, max_size_mb: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Strateji</label>
                  <select
                    className="form-select"
                    value={newCache.strategy}
                    onChange={(e) => setNewCache({...newCache, strategy: e.target.value})}
                  >
                    <option value="lru">LRU (Least Recently Used)</option>
                    <option value="lfu">LFU (Least Frequently Used)</option>
                    <option value="fifo">FIFO (First In First Out)</option>
                    <option value="ttl">TTL (Time To Live)</option>
                  </select>
                  <small className="form-hint">{getStrategyDescription(newCache.strategy)}</small>
                </div>

                <div className="form-group">
                  <label>Default TTL (saniye)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newCache.default_ttl}
                    onChange={(e) => setNewCache({...newCache, default_ttl: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>

                <button
                  className="btn-primary btn-full"
                  onClick={createCache}
                  disabled={loading}
                >
                  {loading ? '⏳ Oluşturuluyor...' : '➕ Cache Oluştur'}
                </button>
              </div>

              <div className="sub-section">
                <h3>Cache Değeri Kaydet</h3>

                <div className="form-group">
                  <label>Cache Seçin</label>
                  <select
                    className="form-select"
                    value={cacheEntry.cache_id}
                    onChange={(e) => setCacheEntry({...cacheEntry, cache_id: e.target.value})}
                  >
                    <option value="">-- Cache Seçin --</option>
                    {caches.map(cache => (
                      <option key={cache.cache_id} value={cache.cache_id}>
                        {cache.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Key</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cacheEntry.key}
                    onChange={(e) => setCacheEntry({...cacheEntry, key: e.target.value})}
                    placeholder="user:123:profile"
                  />
                </div>

                <div className="form-group">
                  <label>Value (JSON veya text)</label>
                  <textarea
                    className="form-textarea"
                    value={cacheEntry.value}
                    onChange={(e) => setCacheEntry({...cacheEntry, value: e.target.value})}
                    placeholder='{"name": "John", "email": "john@example.com"}'
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>TTL (saniye - opsiyonel)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={cacheEntry.ttl}
                    onChange={(e) => setCacheEntry({...cacheEntry, ttl: e.target.value})}
                    placeholder="Boş bırakılırsa default TTL kullanılır"
                  />
                </div>

                <button
                  className="btn-primary btn-full"
                  onClick={setCacheValue}
                  disabled={loading}
                >
                  {loading ? '⏳ Kaydediliyor...' : '💾 Değeri Kaydet'}
                </button>
              </div>

              <div className="sub-section">
                <h3>Cache Değerini Oku</h3>

                <div className="form-group">
                  <label>Cache Seçin</label>
                  <select
                    className="form-select"
                    value={cacheGet.cache_id}
                    onChange={(e) => setCacheGet({...cacheGet, cache_id: e.target.value})}
                  >
                    <option value="">-- Cache Seçin --</option>
                    {caches.map(cache => (
                      <option key={cache.cache_id} value={cache.cache_id}>
                        {cache.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Key</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cacheGet.key}
                    onChange={(e) => setCacheGet({...cacheGet, key: e.target.value})}
                    placeholder="user:123:profile"
                  />
                </div>

                <button
                  className="btn-primary btn-full"
                  onClick={getCacheValue}
                  disabled={loading}
                >
                  {loading ? '⏳ Okunuyor...' : '🔍 Değeri Oku'}
                </button>

                {cacheResult && (
                  <div className={`cache-result ${cacheResult.cached ? 'hit' : 'miss'}`}>
                    {cacheResult.cached ? (
                      <>
                        <div className="result-header">✅ Cache Hit!</div>
                        <div className="result-value">
                          <strong>Value:</strong>
                          <pre>{JSON.stringify(cacheResult.value, null, 2)}</pre>
                        </div>
                        <div className="result-age">Age: {cacheResult.age_seconds}s</div>
                      </>
                    ) : (
                      <>
                        <div className="result-header">❌ Cache Miss</div>
                        <div className="result-error">{cacheResult.error}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Query Optimization Tab */}
      {activeTab === 'query' && (
        <div className="tab-content">
          <div className="panel panel-centered">
            <h2>🔍 SQL Query Optimizasyonu</h2>

            <div className="form-group">
              <label>SQL Query *</label>
              <textarea
                className="form-textarea"
                value={queryOpt.query}
                onChange={(e) => setQueryOpt({...queryOpt, query: e.target.value})}
                placeholder="SELECT * FROM users WHERE email = 'test@example.com' ORDER BY created_at DESC"
                rows="5"
              />
            </div>

            <div className="form-group">
              <label>Tablo Adı *</label>
              <input
                type="text"
                className="form-input"
                value={queryOpt.table}
                onChange={(e) => setQueryOpt({...queryOpt, table: e.target.value})}
                placeholder="users"
              />
            </div>

            <button
              className="btn-primary btn-full"
              onClick={optimizeQuery}
              disabled={loading}
            >
              {loading ? '⏳ Analiz Ediliyor...' : '🚀 Query\'yi Optimize Et'}
            </button>

            {queryResult && (
              <div className="query-result">
                <h3>Optimizasyon Sonucu</h3>

                <div className="result-section">
                  <strong>Tahmini Hızlanma:</strong>
                  <span className="speedup">{queryResult.estimated_speedup}x daha hızlı</span>
                </div>

                <div className="result-section">
                  <strong>Optimize Edilmiş Query:</strong>
                  <pre className="code-block">{queryResult.optimized_query}</pre>
                </div>

                {queryResult.indexes_used.length > 0 && (
                  <div className="result-section">
                    <strong>Kullanılan İndeksler:</strong>
                    <ul>
                      {queryResult.indexes_used.map((index, i) => (
                        <li key={i}>{index}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {queryResult.recommendations.length > 0 && (
                  <div className="result-section">
                    <strong>Öneriler:</strong>
                    <ul className="recommendations">
                      {queryResult.recommendations.map((rec, i) => (
                        <li key={i}>💡 {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compression Tab */}
      {activeTab === 'compression' && (
        <div className="tab-content">
          <div className="panel panel-centered">
            <h2>🗜️ Asset Sıkıştırma</h2>

            <div className="form-group">
              <label>Dosya Yolu *</label>
              <input
                type="text"
                className="form-input"
                value={assetComp.file_path}
                onChange={(e) => setAssetComp({...assetComp, file_path: e.target.value})}
                placeholder="/assets/images/hero.jpg"
              />
            </div>

            <div className="form-group">
              <label>Sıkıştırma Algoritması</label>
              <select
                className="form-select"
                value={assetComp.compression_type}
                onChange={(e) => setAssetComp({...assetComp, compression_type: e.target.value})}
              >
                <option value="gzip">Gzip (hızlı, iyi sıkıştırma)</option>
                <option value="brotli">Brotli (en iyi sıkıştırma)</option>
                <option value="deflate">Deflate (standart)</option>
                <option value="zstd">Zstandard (modern, hızlı)</option>
              </select>
            </div>

            <div className="compression-info">
              <strong>💡 İpucu:</strong>
              <ul>
                <li><strong>Gzip:</strong> En yaygın, tüm tarayıcılarda desteklenir</li>
                <li><strong>Brotli:</strong> %20-25 daha iyi sıkıştırma, modern tarayıcılar</li>
                <li><strong>Deflate:</strong> Eski standart, uyumluluk için</li>
                <li><strong>Zstandard:</strong> Hızlı ve etkili, yeni nesil</li>
              </ul>
            </div>

            <button
              className="btn-primary btn-full"
              onClick={compressAsset}
              disabled={loading}
            >
              {loading ? '⏳ Sıkıştırılıyor...' : '🗜️ Asset\'i Sıkıştır'}
            </button>

            {compressionResult && (
              <div className="compression-result">
                <h3>Sıkıştırma Sonucu</h3>

                <div className="compression-stats">
                  <div className="compression-stat">
                    <span className="stat-label">Orijinal Boyut:</span>
                    <span className="stat-value">
                      {(compressionResult.compression.original_size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="compression-stat">
                    <span className="stat-label">Sıkıştırılmış Boyut:</span>
                    <span className="stat-value">
                      {(compressionResult.compression.compressed_size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="compression-stat">
                    <span className="stat-label">Tasarruf:</span>
                    <span className="stat-value highlight">
                      {compressionResult.saved_percent}% ({(compressionResult.saved_bytes / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  <div className="compression-stat">
                    <span className="stat-label">Sıkıştırma Oranı:</span>
                    <span className="stat-value">
                      {compressionResult.compression.compression_ratio}
                    </span>
                  </div>
                </div>

                <div className="compressed-path">
                  <strong>Çıktı Dosyası:</strong>
                  <code>{compressionResult.compression.compressed_path}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lazy Load Tab */}
      {activeTab === 'lazy-load' && (
        <div className="tab-content">
          <div className="panel panel-centered">
            <h2>⏳ Lazy Loading Yapılandırması</h2>

            <div className="form-group">
              <label>Kaynak Tipi</label>
              <select
                className="form-select"
                value={lazyLoadConfig.resource_type}
                onChange={(e) => setLazyLoadConfig({...lazyLoadConfig, resource_type: e.target.value})}
              >
                <option value="images">Images (Görseller)</option>
                <option value="scripts">Scripts (JavaScript)</option>
                <option value="modules">Modules (Modüller)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Threshold (pixels veya count)</label>
              <input
                type="number"
                className="form-input"
                value={lazyLoadConfig.threshold}
                onChange={(e) => setLazyLoadConfig({...lazyLoadConfig, threshold: parseInt(e.target.value)})}
                min="0"
              />
              <small className="form-hint">
                Görseller için viewport'a olan mesafe (px), diğerleri için eleman sayısı
              </small>
            </div>

            <div className="form-group">
              <label>Placeholder</label>
              <input
                type="text"
                className="form-input"
                value={lazyLoadConfig.placeholder}
                onChange={(e) => setLazyLoadConfig({...lazyLoadConfig, placeholder: e.target.value})}
                placeholder="/placeholder.jpg"
              />
            </div>

            <div className="lazy-load-info">
              <strong>📘 Lazy Loading Nedir?</strong>
              <p>
                Lazy loading, kaynakların (görseller, scriptler, modüller) sadece ihtiyaç duyulduğunda
                yüklenmesini sağlar. Bu sayede:
              </p>
              <ul>
                <li>Sayfa yüklenme süresi azalır</li>
                <li>Bant genişliği tasarrufu sağlanır</li>
                <li>Kullanıcı deneyimi iyileşir</li>
                <li>SEO performansı artar</li>
              </ul>
            </div>

            <button
              className="btn-primary btn-full"
              onClick={configureLazyLoad}
              disabled={loading}
            >
              {loading ? '⏳ Kaydediliyor...' : '💾 Yapılandırmayı Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationManager;
