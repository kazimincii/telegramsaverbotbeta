import React, { useState, useEffect } from 'react';
import './GatewayManager.css';

const GatewayManager = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [rateLimits, setRateLimits] = useState([]);
  const [gatewayStats, setGatewayStats] = useState(null);
  const [apiDocs, setApiDocs] = useState(null);
  const [loading, setLoading] = useState(false);

  // Service registration state
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    base_url: '',
    version: '1.0.0',
    instances: []
  });

  // Instance input state
  const [instanceInput, setInstanceInput] = useState({
    instance_id: '',
    url: '',
    weight: 1
  });

  // Route creation state
  const [newRoute, setNewRoute] = useState({
    path: '',
    method: 'GET',
    service_id: '',
    target_path: '',
    description: '',
    auth_required: false,
    timeout: 5000,
    cache_enabled: false
  });

  // Rate limit creation state
  const [newRateLimit, setNewRateLimit] = useState({
    name: '',
    description: '',
    max_requests: 100,
    period: 'minute',
    scope: 'user'
  });

  // Load balancer config state
  const [lbConfig, setLbConfig] = useState({
    service_id: '',
    strategy: 'round_robin',
    health_check_interval: 30,
    session_affinity: false
  });

  useEffect(() => {
    loadServices();
    loadRoutes();
    loadRateLimits();
    loadGatewayStats();
    loadApiDocs();

    const interval = setInterval(() => {
      loadGatewayStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/gateway/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadRoutes = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/gateway/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error('Failed to load routes:', error);
    }
  };

  const loadRateLimits = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/gateway/rate-limits');
      if (response.ok) {
        const data = await response.json();
        setRateLimits(data.rate_limits || []);
      }
    } catch (error) {
      console.error('Failed to load rate limits:', error);
    }
  };

  const loadGatewayStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/gateway/stats');
      if (response.ok) {
        const data = await response.json();
        setGatewayStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load gateway stats:', error);
    }
  };

  const loadApiDocs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/gateway/documentation');
      if (response.ok) {
        const data = await response.json();
        setApiDocs(data);
      }
    } catch (error) {
      console.error('Failed to load API docs:', error);
    }
  };

  const addInstance = () => {
    if (!instanceInput.instance_id || !instanceInput.url) {
      alert('Lütfen instance ID ve URL girin');
      return;
    }

    setNewService({
      ...newService,
      instances: [...newService.instances, { ...instanceInput }]
    });

    setInstanceInput({ instance_id: '', url: '', weight: 1 });
  };

  const removeInstance = (index) => {
    setNewService({
      ...newService,
      instances: newService.instances.filter((_, i) => i !== index)
    });
  };

  const registerService = async () => {
    if (!newService.name || !newService.base_url || newService.instances.length === 0) {
      alert('Lütfen tüm gerekli alanları doldurun ve en az 1 instance ekleyin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/gateway/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService)
      });

      if (response.ok) {
        alert('Servis başarıyla kaydedildi!');
        setNewService({
          name: '',
          description: '',
          base_url: '',
          version: '1.0.0',
          instances: []
        });
        loadServices();
      }
    } catch (error) {
      console.error('Failed to register service:', error);
      alert('Servis kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const deregisterService = async (serviceId) => {
    if (!window.confirm('Bu servisi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/gateway/services/${serviceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Servis silindi!');
        loadServices();
        loadRoutes();
      }
    } catch (error) {
      console.error('Failed to deregister service:', error);
    }
  };

  const createRoute = async () => {
    if (!newRoute.path || !newRoute.service_id || !newRoute.target_path) {
      alert('Lütfen path, servis ve target path girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/gateway/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoute)
      });

      if (response.ok) {
        alert('Route oluşturuldu!');
        setNewRoute({
          path: '',
          method: 'GET',
          service_id: '',
          target_path: '',
          description: '',
          auth_required: false,
          timeout: 5000,
          cache_enabled: false
        });
        loadRoutes();
      }
    } catch (error) {
      console.error('Failed to create route:', error);
      alert('Route oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const createRateLimit = async () => {
    if (!newRateLimit.name || !newRateLimit.max_requests) {
      alert('Lütfen ad ve maksimum istek sayısı girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/gateway/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRateLimit)
      });

      if (response.ok) {
        alert('Rate limit oluşturuldu!');
        setNewRateLimit({
          name: '',
          description: '',
          max_requests: 100,
          period: 'minute',
          scope: 'user'
        });
        loadRateLimits();
      }
    } catch (error) {
      console.error('Failed to create rate limit:', error);
      alert('Rate limit oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const configureLoadBalancer = async () => {
    if (!lbConfig.service_id) {
      alert('Lütfen bir servis seçin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/gateway/load-balancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lbConfig)
      });

      if (response.ok) {
        alert('Load balancer yapılandırıldı!');
      }
    } catch (error) {
      console.error('Failed to configure load balancer:', error);
      alert('Load balancer yapılandırılamadı');
    } finally {
      setLoading(false);
    }
  };

  const performHealthCheck = async (serviceId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/gateway/services/${serviceId}/health-check`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Health Check: ${data.status}\nKontrol Zamanı: ${new Date(data.checked_at).toLocaleString('tr-TR')}`);
        loadServices();
      }
    } catch (error) {
      console.error('Failed to perform health check:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'unhealthy': return '#ef4444';
      case 'degraded': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'unhealthy': return '❌';
      case 'degraded': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="gateway-manager-container">
      <div className="gateway-manager-header">
        <h1 className="gateway-manager-title">🌐 API Gateway & Microservices</h1>
        <p className="gateway-manager-subtitle">Servis yönetimi, routing, load balancing ve rate limiting</p>
      </div>

      {/* Gateway Stats */}
      {gatewayStats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔧</div>
            <div className="stat-content">
              <div className="stat-value">{gatewayStats.total_services}</div>
              <div className="stat-label">Toplam Servis</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{gatewayStats.healthy_services}</div>
              <div className="stat-label">Sağlıklı Servis</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛣️</div>
            <div className="stat-content">
              <div className="stat-value">{gatewayStats.enabled_routes}</div>
              <div className="stat-label">Aktif Route</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-value">{gatewayStats.active_rate_limits}</div>
              <div className="stat-label">Rate Limit</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="gateway-tabs">
        <button
          className={`gateway-tab ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          🔧 Servisler
        </button>
        <button
          className={`gateway-tab ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          🛣️ Routes
        </button>
        <button
          className={`gateway-tab ${activeTab === 'rate-limits' ? 'active' : ''}`}
          onClick={() => setActiveTab('rate-limits')}
        >
          ⚡ Rate Limiting
        </button>
        <button
          className={`gateway-tab ${activeTab === 'load-balancer' ? 'active' : ''}`}
          onClick={() => setActiveTab('load-balancer')}
        >
          ⚖️ Load Balancer
        </button>
        <button
          className={`gateway-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          📚 API Docs
        </button>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* Service List */}
            <div className="panel panel-wide">
              <h2>Kayıtlı Servisler ({services.length})</h2>

              {services.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz servis kaydedilmemiş</p>
                </div>
              ) : (
                <div className="services-list">
                  {services.map(service => (
                    <div key={service.service_id} className="service-card">
                      <div className="service-header">
                        <div>
                          <h3>{service.name}</h3>
                          <span className="service-version">v{service.version}</span>
                        </div>
                        <div className="service-status" style={{ backgroundColor: getStatusColor(service.status) }}>
                          {getStatusIcon(service.status)} {service.status}
                        </div>
                      </div>

                      <p className="service-description">{service.description}</p>

                      <div className="service-info">
                        <div><strong>Base URL:</strong> {service.base_url}</div>
                        <div><strong>Health Check:</strong> {service.health_check_url}</div>
                        <div><strong>Instances:</strong> {service.instances?.length || 0}</div>
                      </div>

                      {service.instances && service.instances.length > 0 && (
                        <div className="instances-list">
                          <strong>Instances:</strong>
                          {service.instances.map((inst, idx) => (
                            <div key={idx} className="instance-item">
                              <span className="instance-id">{inst.instance_id}</span>
                              <span className="instance-url">{inst.url}</span>
                              <span className="instance-weight">Weight: {inst.weight}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="service-actions">
                        <button
                          className="btn-small btn-primary"
                          onClick={() => performHealthCheck(service.service_id)}
                        >
                          🏥 Health Check
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => deregisterService(service.service_id)}
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Register Service */}
            <div className="panel">
              <h2>Yeni Servis Kaydet</h2>

              <div className="form-group">
                <label>Servis Adı *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                  placeholder="Authentication Service"
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  value={newService.description}
                  onChange={(e) => setNewService({...newService, description: e.target.value})}
                  placeholder="User authentication and authorization"
                />
              </div>

              <div className="form-group">
                <label>Base URL *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newService.base_url}
                  onChange={(e) => setNewService({...newService, base_url: e.target.value})}
                  placeholder="http://auth-service:8001"
                />
              </div>

              <div className="form-group">
                <label>Version</label>
                <input
                  type="text"
                  className="form-input"
                  value={newService.version}
                  onChange={(e) => setNewService({...newService, version: e.target.value})}
                  placeholder="1.0.0"
                />
              </div>

              <div className="form-section">
                <h3>Instances</h3>
                <div className="instance-input-group">
                  <input
                    type="text"
                    className="form-input"
                    value={instanceInput.instance_id}
                    onChange={(e) => setInstanceInput({...instanceInput, instance_id: e.target.value})}
                    placeholder="Instance ID"
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={instanceInput.url}
                    onChange={(e) => setInstanceInput({...instanceInput, url: e.target.value})}
                    placeholder="URL"
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={instanceInput.weight}
                    onChange={(e) => setInstanceInput({...instanceInput, weight: parseInt(e.target.value)})}
                    placeholder="Weight"
                    min="1"
                  />
                  <button className="btn-secondary" onClick={addInstance}>
                    ➕ Ekle
                  </button>
                </div>

                {newService.instances.length > 0 && (
                  <div className="instances-preview">
                    {newService.instances.map((inst, idx) => (
                      <div key={idx} className="instance-preview-item">
                        <span>{inst.instance_id} - {inst.url} (w:{inst.weight})</span>
                        <button
                          className="btn-remove"
                          onClick={() => removeInstance(idx)}
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn-primary btn-full"
                onClick={registerService}
                disabled={loading}
              >
                {loading ? '⏳ Kaydediliyor...' : '✅ Servisi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routes Tab */}
      {activeTab === 'routes' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* Routes List */}
            <div className="panel panel-wide">
              <h2>API Routes ({routes.length})</h2>

              {routes.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz route tanımlanmamış</p>
                </div>
              ) : (
                <div className="routes-list">
                  {routes.map(route => (
                    <div key={route.route_id} className="route-card">
                      <div className="route-header">
                        <span className={`route-method ${route.method.toLowerCase()}`}>
                          {route.method}
                        </span>
                        <span className="route-path">{route.path}</span>
                        {route.enabled ? (
                          <span className="badge badge-success">Aktif</span>
                        ) : (
                          <span className="badge badge-disabled">Pasif</span>
                        )}
                      </div>

                      <p className="route-description">{route.description}</p>

                      <div className="route-details">
                        <div><strong>Target:</strong> {route.target_path}</div>
                        <div><strong>Timeout:</strong> {route.timeout}ms</div>
                        {route.auth_required && <span className="route-tag">🔒 Auth Required</span>}
                        {route.cache_enabled && <span className="route-tag">💾 Cached</span>}
                        {route.rate_limit_id && <span className="route-tag">⚡ Rate Limited</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Route */}
            <div className="panel">
              <h2>Yeni Route Oluştur</h2>

              <div className="form-group">
                <label>Path *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newRoute.path}
                  onChange={(e) => setNewRoute({...newRoute, path: e.target.value})}
                  placeholder="/api/auth/login"
                />
              </div>

              <div className="form-group">
                <label>Method</label>
                <select
                  className="form-select"
                  value={newRoute.method}
                  onChange={(e) => setNewRoute({...newRoute, method: e.target.value})}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div className="form-group">
                <label>Servis *</label>
                <select
                  className="form-select"
                  value={newRoute.service_id}
                  onChange={(e) => setNewRoute({...newRoute, service_id: e.target.value})}
                >
                  <option value="">-- Servis Seçin --</option>
                  {services.map(service => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Target Path *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newRoute.target_path}
                  onChange={(e) => setNewRoute({...newRoute, target_path: e.target.value})}
                  placeholder="/login"
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  value={newRoute.description}
                  onChange={(e) => setNewRoute({...newRoute, description: e.target.value})}
                  placeholder="User login endpoint"
                />
              </div>

              <div className="form-group">
                <label>Timeout (ms)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newRoute.timeout}
                  onChange={(e) => setNewRoute({...newRoute, timeout: parseInt(e.target.value)})}
                  min="1000"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newRoute.auth_required}
                    onChange={(e) => setNewRoute({...newRoute, auth_required: e.target.checked})}
                  />
                  <span>Authentication Required</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newRoute.cache_enabled}
                    onChange={(e) => setNewRoute({...newRoute, cache_enabled: e.target.checked})}
                  />
                  <span>Enable Caching</span>
                </label>
              </div>

              <button
                className="btn-primary btn-full"
                onClick={createRoute}
                disabled={loading}
              >
                {loading ? '⏳ Oluşturuluyor...' : '➕ Route Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limits Tab */}
      {activeTab === 'rate-limits' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* Rate Limits List */}
            <div className="panel panel-wide">
              <h2>Rate Limit Yapılandırmaları ({rateLimits.length})</h2>

              {rateLimits.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz rate limit tanımlanmamış</p>
                </div>
              ) : (
                <div className="rate-limits-list">
                  {rateLimits.map(limit => (
                    <div key={limit.limit_id} className="rate-limit-card">
                      <div className="rate-limit-header">
                        <h3>{limit.name}</h3>
                        {limit.enabled ? (
                          <span className="badge badge-success">Aktif</span>
                        ) : (
                          <span className="badge badge-disabled">Pasif</span>
                        )}
                      </div>

                      <p className="rate-limit-description">{limit.description}</p>

                      <div className="rate-limit-details">
                        <div className="rate-limit-value">
                          {limit.max_requests} requests / {limit.period}
                        </div>
                        <div className="rate-limit-scope">
                          Scope: <strong>{limit.scope}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Rate Limit */}
            <div className="panel">
              <h2>Yeni Rate Limit Oluştur</h2>

              <div className="form-group">
                <label>Ad *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newRateLimit.name}
                  onChange={(e) => setNewRateLimit({...newRateLimit, name: e.target.value})}
                  placeholder="Per User Rate Limit"
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  value={newRateLimit.description}
                  onChange={(e) => setNewRateLimit({...newRateLimit, description: e.target.value})}
                  placeholder="Rate limit per authenticated user"
                />
              </div>

              <div className="form-group">
                <label>Maksimum İstek Sayısı *</label>
                <input
                  type="number"
                  className="form-input"
                  value={newRateLimit.max_requests}
                  onChange={(e) => setNewRateLimit({...newRateLimit, max_requests: parseInt(e.target.value)})}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Periyot</label>
                <select
                  className="form-select"
                  value={newRateLimit.period}
                  onChange={(e) => setNewRateLimit({...newRateLimit, period: e.target.value})}
                >
                  <option value="second">Saniye</option>
                  <option value="minute">Dakika</option>
                  <option value="hour">Saat</option>
                  <option value="day">Gün</option>
                </select>
              </div>

              <div className="form-group">
                <label>Scope</label>
                <select
                  className="form-select"
                  value={newRateLimit.scope}
                  onChange={(e) => setNewRateLimit({...newRateLimit, scope: e.target.value})}
                >
                  <option value="global">Global (tüm istekler)</option>
                  <option value="user">User (kullanıcı bazlı)</option>
                  <option value="ip">IP (IP bazlı)</option>
                  <option value="api_key">API Key</option>
                </select>
              </div>

              <button
                className="btn-primary btn-full"
                onClick={createRateLimit}
                disabled={loading}
              >
                {loading ? '⏳ Oluşturuluyor...' : '➕ Rate Limit Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Balancer Tab */}
      {activeTab === 'load-balancer' && (
        <div className="tab-content">
          <div className="panel panel-centered">
            <h2>⚖️ Load Balancer Yapılandırması</h2>

            <div className="form-group">
              <label>Servis *</label>
              <select
                className="form-select"
                value={lbConfig.service_id}
                onChange={(e) => setLbConfig({...lbConfig, service_id: e.target.value})}
              >
                <option value="">-- Servis Seçin --</option>
                {services.map(service => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.name} ({service.instances?.length || 0} instances)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Strateji</label>
              <select
                className="form-select"
                value={lbConfig.strategy}
                onChange={(e) => setLbConfig({...lbConfig, strategy: e.target.value})}
              >
                <option value="round_robin">Round Robin</option>
                <option value="least_connections">Least Connections</option>
                <option value="weighted">Weighted</option>
                <option value="random">Random</option>
                <option value="ip_hash">IP Hash</option>
              </select>
            </div>

            <div className="strategy-info">
              <strong>📘 Strateji Açıklamaları:</strong>
              <ul>
                <li><strong>Round Robin:</strong> İstekleri sırayla tüm instance'lara dağıtır</li>
                <li><strong>Least Connections:</strong> En az aktif bağlantısı olan instance'ı seçer</li>
                <li><strong>Weighted:</strong> Instance weight değerlerine göre dağıtır</li>
                <li><strong>Random:</strong> Rastgele instance seçer</li>
                <li><strong>IP Hash:</strong> Client IP'sine göre aynı instance'a yönlendirir</li>
              </ul>
            </div>

            <div className="form-group">
              <label>Health Check Aralığı (saniye)</label>
              <input
                type="number"
                className="form-input"
                value={lbConfig.health_check_interval}
                onChange={(e) => setLbConfig({...lbConfig, health_check_interval: parseInt(e.target.value)})}
                min="10"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={lbConfig.session_affinity}
                  onChange={(e) => setLbConfig({...lbConfig, session_affinity: e.target.checked})}
                />
                <span>Session Affinity (Sticky Sessions)</span>
              </label>
            </div>

            <button
              className="btn-primary btn-full"
              onClick={configureLoadBalancer}
              disabled={loading}
            >
              {loading ? '⏳ Yapılandırılıyor...' : '⚙️ Load Balancer Yapılandır'}
            </button>
          </div>
        </div>
      )}

      {/* API Documentation Tab */}
      {activeTab === 'docs' && (
        <div className="tab-content">
          <div className="api-docs-container">
            <h2>📚 API Documentation</h2>

            {apiDocs ? (
              <>
                <div className="api-docs-header">
                  <div className="api-version">API Version: {apiDocs.api_version}</div>
                  <div className="api-endpoints-count">
                    Total Endpoints: {apiDocs.total_endpoints}
                  </div>
                </div>

                <div className="endpoints-list">
                  {apiDocs.endpoints?.map((endpoint, index) => (
                    <div key={index} className="endpoint-card">
                      <div className="endpoint-header">
                        <span className={`endpoint-method ${endpoint.method.toLowerCase()}`}>
                          {endpoint.method}
                        </span>
                        <span className="endpoint-path">{endpoint.path}</span>
                      </div>

                      <p className="endpoint-description">{endpoint.description}</p>

                      <div className="endpoint-meta">
                        <span className="endpoint-service">Service: {endpoint.service}</span>
                        {endpoint.auth_required && <span className="endpoint-tag">🔒 Auth</span>}
                        {endpoint.rate_limited && <span className="endpoint-tag">⚡ Limited</span>}
                        {endpoint.cache_enabled && <span className="endpoint-tag">💾 Cached</span>}
                        <span className="endpoint-timeout">Timeout: {endpoint.timeout}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>API dökümantasyonu yükleniyor...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GatewayManager;
