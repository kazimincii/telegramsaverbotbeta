import React, { useState, useEffect } from 'react';
import './BIManager.css';

const BIManager = () => {
  const [activeTab, setActiveTab] = useState('dashboards');
  const [dashboards, setDashboards] = useState([]);
  const [kpis, setKPIs] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dashboard builder state
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: '',
    widgets: [],
    refresh_interval: 300,
    is_public: false
  });

  // KPI creator state
  const [newKPI, setNewKPI] = useState({
    name: '',
    description: '',
    metric: '',
    kpi_type: 'count',
    target_value: '',
    current_value: '',
    unit: ''
  });

  // Report builder state
  const [reportConfig, setReportConfig] = useState({
    name: '',
    description: '',
    template: 'standard',
    data_sources: [],
    format: 'pdf'
  });

  // Data query state
  const [queryConfig, setQueryConfig] = useState({
    name: '',
    filters: {},
    filterText: ''
  });
  const [queryResults, setQueryResults] = useState(null);

  useEffect(() => {
    loadDashboards();
    loadKPIs();
  }, []);

  const loadDashboards = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bi/dashboards?user_id=test_user');
      if (response.ok) {
        const data = await response.json();
        setDashboards(data.dashboards || []);
      }
    } catch (error) {
      console.error('Failed to load dashboards:', error);
    }
  };

  const loadKPIs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bi/kpis?user_id=test_user');
      if (response.ok) {
        const data = await response.json();
        setKPIs(data.kpis || []);
      }
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    }
  };

  const createDashboard = async () => {
    if (!newDashboard.name || !newDashboard.description) {
      alert('Lütfen dashboard adı ve açıklaması girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/bi/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDashboard,
          user_id: 'test_user'
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Dashboard oluşturuldu!');
        setNewDashboard({
          name: '',
          description: '',
          widgets: [],
          refresh_interval: 300,
          is_public: false
        });
        loadDashboards();
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      alert('Dashboard oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const viewDashboard = async (dashboardId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/bi/dashboards/${dashboardId}?user_id=test_user`
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedDashboard(data.dashboard);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const createKPI = async () => {
    if (!newKPI.name || !newKPI.metric) {
      alert('Lütfen KPI adı ve metrik girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/bi/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newKPI,
          user_id: 'test_user',
          target_value: parseFloat(newKPI.target_value) || null,
          current_value: parseFloat(newKPI.current_value) || 0,
          time_range: 'this_month'
        })
      });

      if (response.ok) {
        alert('KPI oluşturuldu!');
        setNewKPI({
          name: '',
          description: '',
          metric: '',
          kpi_type: 'count',
          target_value: '',
          current_value: '',
          unit: ''
        });
        loadKPIs();
      }
    } catch (error) {
      console.error('Failed to create KPI:', error);
      alert('KPI oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const updateKPIValue = async (kpiId, newValue) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/bi/kpis/${kpiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpi_id: kpiId,
          current_value: parseFloat(newValue)
        })
      });

      if (response.ok) {
        alert('KPI güncellendi!');
        loadKPIs();
      }
    } catch (error) {
      console.error('Failed to update KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!reportConfig.name) {
      alert('Lütfen rapor adı girin');
      return;
    }

    setLoading(true);
    try {
      // First create the report
      const createResponse = await fetch('http://localhost:8000/api/bi/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportConfig,
          user_id: 'test_user',
          data_sources: reportConfig.data_sources.length > 0
            ? reportConfig.data_sources
            : ['default']
        })
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        const reportId = createData.report_id;

        // Then generate it
        const genResponse = await fetch(
          `http://localhost:8000/api/bi/reports/${reportId}/generate?user_id=test_user`,
          { method: 'POST' }
        );

        if (genResponse.ok) {
          const genData = await genResponse.json();
          alert(`Rapor oluşturuldu! Format: ${genData.format}`);
          console.log('Report data:', genData.data);
        }
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Rapor oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!queryConfig.name) {
      alert('Lütfen sorgu adı girin');
      return;
    }

    setLoading(true);
    try {
      let filters = {};
      if (queryConfig.filterText) {
        try {
          filters = JSON.parse(queryConfig.filterText);
        } catch (e) {
          filters = { search: queryConfig.filterText };
        }
      }

      const response = await fetch('http://localhost:8000/api/bi/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: queryConfig.name,
          filters: filters,
          user_id: 'test_user'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setQueryResults(data.query);
      }
    } catch (error) {
      console.error('Failed to execute query:', error);
      alert('Sorgu çalıştırılamadı');
    } finally {
      setLoading(false);
    }
  };

  const exportDashboard = async (dashboardId, format) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/bi/dashboards/${dashboardId}/export?format=${format}&user_id=test_user`
      );
      if (response.ok) {
        const data = await response.json();
        alert(`Dashboard ${format.toUpperCase()} formatında dışa aktarıldı!`);
        console.log('Export URL:', data.download_url);
      }
    } catch (error) {
      console.error('Failed to export dashboard:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="bi-manager-container">
      <div className="bi-manager-header">
        <h1 className="bi-manager-title">📊 Business Intelligence Dashboard</h1>
        <p className="bi-manager-subtitle">Analitik, KPI takibi ve raporlama sistemi</p>
      </div>

      {/* Tabs */}
      <div className="bi-tabs">
        <button
          className={`bi-tab ${activeTab === 'dashboards' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboards')}
        >
          📊 Dashboardlar
        </button>
        <button
          className={`bi-tab ${activeTab === 'kpis' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpis')}
        >
          🎯 KPI'lar
        </button>
        <button
          className={`bi-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📄 Raporlar
        </button>
        <button
          className={`bi-tab ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          🔍 Veri Sorguları
        </button>
      </div>

      {/* Dashboards Tab */}
      {activeTab === 'dashboards' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* Dashboard List */}
            <div className="panel">
              <h2>Mevcut Dashboardlar ({dashboards.length})</h2>

              {dashboards.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz dashboard oluşturulmamış</p>
                </div>
              ) : (
                <div className="dashboard-list">
                  {dashboards.map(dashboard => (
                    <div key={dashboard.dashboard_id} className="dashboard-card">
                      <div className="dashboard-header">
                        <h3>{dashboard.name}</h3>
                        <span className={`badge ${dashboard.is_public ? 'public' : 'private'}`}>
                          {dashboard.is_public ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </div>
                      <p className="dashboard-description">{dashboard.description}</p>
                      <div className="dashboard-meta">
                        <span>📊 {dashboard.widgets?.length || 0} widget</span>
                        <span>🔄 {dashboard.refresh_interval}s refresh</span>
                      </div>
                      <div className="dashboard-actions">
                        <button
                          className="btn-small btn-primary"
                          onClick={() => viewDashboard(dashboard.dashboard_id)}
                        >
                          👁️ Görüntüle
                        </button>
                        <button
                          className="btn-small btn-secondary"
                          onClick={() => exportDashboard(dashboard.dashboard_id, 'pdf')}
                        >
                          📥 PDF
                        </button>
                        <button
                          className="btn-small btn-secondary"
                          onClick={() => exportDashboard(dashboard.dashboard_id, 'excel')}
                        >
                          📥 Excel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Dashboard */}
            <div className="panel">
              <h2>Yeni Dashboard Oluştur</h2>

              <div className="form-group">
                <label>Dashboard Adı *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDashboard.name}
                  onChange={(e) => setNewDashboard({...newDashboard, name: e.target.value})}
                  placeholder="Executive Dashboard"
                />
              </div>

              <div className="form-group">
                <label>Açıklama *</label>
                <textarea
                  className="form-textarea"
                  value={newDashboard.description}
                  onChange={(e) => setNewDashboard({...newDashboard, description: e.target.value})}
                  placeholder="Ana iş metrikleri ve KPI'lar"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Yenileme Aralığı (saniye)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newDashboard.refresh_interval}
                  onChange={(e) => setNewDashboard({...newDashboard, refresh_interval: parseInt(e.target.value)})}
                  min="30"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newDashboard.is_public}
                    onChange={(e) => setNewDashboard({...newDashboard, is_public: e.target.checked})}
                  />
                  <span>Public Dashboard (herkes görebilir)</span>
                </label>
              </div>

              <button
                className="btn-primary btn-full"
                onClick={createDashboard}
                disabled={loading}
              >
                {loading ? '⏳ Oluşturuluyor...' : '➕ Dashboard Oluştur'}
              </button>
            </div>
          </div>

          {/* Selected Dashboard View */}
          {selectedDashboard && (
            <div className="dashboard-viewer">
              <div className="viewer-header">
                <h2>📊 {selectedDashboard.name}</h2>
                <button
                  className="btn-close"
                  onClick={() => setSelectedDashboard(null)}
                >
                  ✕
                </button>
              </div>

              <p className="viewer-description">{selectedDashboard.description}</p>

              <div className="widgets-grid">
                {selectedDashboard.widgets?.map((widget, index) => (
                  <div key={widget.widget_id || index} className="widget-card">
                    {widget.type === 'kpi_card' && widget.kpi_data && (
                      <div className="kpi-widget">
                        <h3>{widget.kpi_data.name}</h3>
                        <div className="kpi-value-large">
                          {widget.kpi_data.unit === '$' && widget.kpi_data.unit}
                          {widget.kpi_data.current_value.toLocaleString()}
                          {widget.kpi_data.unit !== '$' && widget.kpi_data.unit}
                        </div>
                        <div className="kpi-change">
                          {getTrendIcon(widget.kpi_data.trend)}{' '}
                          {widget.kpi_data.change_percentage?.toFixed(2)}%
                        </div>
                      </div>
                    )}

                    {widget.type === 'chart' && (
                      <div className="chart-widget">
                        <h3>{widget.chart_type?.toUpperCase()} Chart</h3>
                        <div className="chart-placeholder">
                          📈 Chart Data: {widget.data_source}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {selectedDashboard.widgets?.length === 0 && (
                  <div className="empty-state">
                    <p>Bu dashboard'da henüz widget yok</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs Tab */}
      {activeTab === 'kpis' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* KPI List */}
            <div className="panel panel-wide">
              <h2>Tüm KPI'lar ({kpis.length})</h2>

              {kpis.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz KPI tanımlanmamış</p>
                </div>
              ) : (
                <div className="kpi-grid">
                  {kpis.map(kpi => (
                    <div
                      key={kpi.kpi_id}
                      className="kpi-card"
                      style={{ borderLeftColor: getStatusColor(kpi.status) }}
                    >
                      <div className="kpi-header">
                        <h3>{kpi.name}</h3>
                        <span
                          className="kpi-status-badge"
                          style={{ backgroundColor: getStatusColor(kpi.status) }}
                        >
                          {kpi.status}
                        </span>
                      </div>

                      <p className="kpi-description">{kpi.description}</p>

                      <div className="kpi-value">
                        <span className="kpi-current">
                          {kpi.unit === '$' && kpi.unit}
                          {kpi.current_value.toLocaleString()}
                          {kpi.unit !== '$' && kpi.unit}
                        </span>
                        {kpi.target_value && (
                          <span className="kpi-target">
                            / {kpi.unit === '$' && kpi.unit}
                            {kpi.target_value.toLocaleString()}
                            {kpi.unit !== '$' && kpi.unit}
                          </span>
                        )}
                      </div>

                      {kpi.change_percentage !== null && (
                        <div className="kpi-change-info">
                          <span className="trend-icon">{getTrendIcon(kpi.trend)}</span>
                          <span className={`change-value ${kpi.trend}`}>
                            {kpi.change_percentage > 0 && '+'}
                            {kpi.change_percentage.toFixed(2)}%
                          </span>
                          <span className="change-label">vs. previous</span>
                        </div>
                      )}

                      <div className="kpi-meta">
                        <span>📊 {kpi.kpi_type}</span>
                        <span>📅 {kpi.time_range.replace(/_/g, ' ')}</span>
                      </div>

                      <div className="kpi-actions">
                        <button
                          className="btn-small btn-primary"
                          onClick={() => {
                            const newValue = prompt('Yeni değer:', kpi.current_value);
                            if (newValue !== null) {
                              updateKPIValue(kpi.kpi_id, newValue);
                            }
                          }}
                        >
                          ✏️ Güncelle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create KPI */}
            <div className="panel">
              <h2>Yeni KPI Oluştur</h2>

              <div className="form-group">
                <label>KPI Adı *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newKPI.name}
                  onChange={(e) => setNewKPI({...newKPI, name: e.target.value})}
                  placeholder="Toplam Kullanıcılar"
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  value={newKPI.description}
                  onChange={(e) => setNewKPI({...newKPI, description: e.target.value})}
                  placeholder="Kayıtlı kullanıcı sayısı"
                />
              </div>

              <div className="form-group">
                <label>Metrik *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newKPI.metric}
                  onChange={(e) => setNewKPI({...newKPI, metric: e.target.value})}
                  placeholder="user_count"
                />
              </div>

              <div className="form-group">
                <label>KPI Tipi</label>
                <select
                  className="form-select"
                  value={newKPI.kpi_type}
                  onChange={(e) => setNewKPI({...newKPI, kpi_type: e.target.value})}
                >
                  <option value="count">Count (Sayım)</option>
                  <option value="sum">Sum (Toplam)</option>
                  <option value="average">Average (Ortalama)</option>
                  <option value="percentage">Percentage (Yüzde)</option>
                  <option value="ratio">Ratio (Oran)</option>
                  <option value="growth">Growth (Büyüme)</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hedef Değer</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newKPI.target_value}
                    onChange={(e) => setNewKPI({...newKPI, target_value: e.target.value})}
                    placeholder="10000"
                  />
                </div>

                <div className="form-group">
                  <label>Mevcut Değer</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newKPI.current_value}
                    onChange={(e) => setNewKPI({...newKPI, current_value: e.target.value})}
                    placeholder="8543"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Birim</label>
                <input
                  type="text"
                  className="form-input"
                  value={newKPI.unit}
                  onChange={(e) => setNewKPI({...newKPI, unit: e.target.value})}
                  placeholder="$, %, users, vb."
                />
              </div>

              <button
                className="btn-primary btn-full"
                onClick={createKPI}
                disabled={loading}
              >
                {loading ? '⏳ Oluşturuluyor...' : '➕ KPI Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="tab-content">
          <div className="panel panel-centered">
            <h2>📄 Rapor Oluştur</h2>

            <div className="form-group">
              <label>Rapor Adı *</label>
              <input
                type="text"
                className="form-input"
                value={reportConfig.name}
                onChange={(e) => setReportConfig({...reportConfig, name: e.target.value})}
                placeholder="Aylık Özet Raporu"
              />
            </div>

            <div className="form-group">
              <label>Açıklama</label>
              <textarea
                className="form-textarea"
                value={reportConfig.description}
                onChange={(e) => setReportConfig({...reportConfig, description: e.target.value})}
                placeholder="Bu ay için detaylı metrikleri içeren rapor"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Rapor Şablonu</label>
              <select
                className="form-select"
                value={reportConfig.template}
                onChange={(e) => setReportConfig({...reportConfig, template: e.target.value})}
              >
                <option value="standard">Standart Rapor</option>
                <option value="executive">Yönetici Özeti</option>
                <option value="detailed">Detaylı Analiz</option>
                <option value="comparison">Karşılaştırmalı</option>
              </select>
            </div>

            <div className="form-group">
              <label>Format</label>
              <select
                className="form-select"
                value={reportConfig.format}
                onChange={(e) => setReportConfig({...reportConfig, format: e.target.value})}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div className="info-box">
              <strong>📋 Rapor İçeriği:</strong>
              <ul>
                <li>Özet bölüm</li>
                <li>Anahtar metrikler tablosu</li>
                <li>Trend grafikleri</li>
                <li>Detaylı veri analizi</li>
              </ul>
            </div>

            <button
              className="btn-primary btn-full"
              onClick={generateReport}
              disabled={loading}
            >
              {loading ? '⏳ Oluşturuluyor...' : '📊 Rapor Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* Query Tab */}
      {activeTab === 'query' && (
        <div className="tab-content">
          <div className="content-grid">
            {/* Query Builder */}
            <div className="panel">
              <h2>🔍 Veri Sorgusu Oluştur</h2>

              <div className="form-group">
                <label>Sorgu Adı *</label>
                <input
                  type="text"
                  className="form-input"
                  value={queryConfig.name}
                  onChange={(e) => setQueryConfig({...queryConfig, name: e.target.value})}
                  placeholder="Kullanıcı Aktivite Sorgusu"
                />
              </div>

              <div className="form-group">
                <label>Filtreler (JSON veya metin)</label>
                <textarea
                  className="form-textarea"
                  value={queryConfig.filterText}
                  onChange={(e) => setQueryConfig({...queryConfig, filterText: e.target.value})}
                  placeholder='{"category": "A", "date_range": "last_30_days"}'
                  rows="4"
                />
              </div>

              <div className="info-box">
                <strong>💡 İpucu:</strong>
                <p>JSON formatında filtre yazabilir veya basit metin arama yapabilirsiniz.</p>
              </div>

              <button
                className="btn-primary btn-full"
                onClick={executeQuery}
                disabled={loading}
              >
                {loading ? '⏳ Çalıştırılıyor...' : '▶️ Sorguyu Çalıştır'}
              </button>
            </div>

            {/* Query Results */}
            <div className="panel">
              <h2>📊 Sorgu Sonuçları</h2>

              {queryResults ? (
                <div className="query-results">
                  <div className="results-meta">
                    <div className="meta-item">
                      <strong>Sorgu ID:</strong> {queryResults.query_id}
                    </div>
                    <div className="meta-item">
                      <strong>Toplam Satır:</strong> {queryResults.total_rows}
                    </div>
                    <div className="meta-item">
                      <strong>Süre:</strong> {queryResults.execution_time_ms}ms
                    </div>
                    <div className="meta-item">
                      <strong>Cache:</strong> {queryResults.cached ? '✅' : '❌'}
                    </div>
                  </div>

                  <div className="results-table-container">
                    <table className="results-table">
                      <thead>
                        <tr>
                          {queryResults.results.length > 0 &&
                            Object.keys(queryResults.results[0]).map(key => (
                              <th key={key}>{key}</th>
                            ))
                          }
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.results.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, i) => (
                              <td key={i}>{String(value)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Sorgu sonuçları burada görünecek</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BIManager;
