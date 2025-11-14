import React, { useState, useEffect, useRef } from 'react';
import './AdvancedAnalytics.css';

const API_BASE = 'http://localhost:8000';

// Time range options
const TIME_RANGES = [
  { value: 'last_hour', label: 'Son 1 Saat' },
  { value: 'last_day', label: 'Son 24 Saat' },
  { value: 'last_week', label: 'Son 7 Gün' },
  { value: 'last_month', label: 'Son 30 Gün' },
  { value: 'last_year', label: 'Son 1 Yıl' },
  { value: 'all_time', label: 'Tüm Zamanlar' }
];

const AdvancedAnalytics = () => {
  // State management
  const [timeRange, setTimeRange] = useState('last_week');
  const [dashboardData, setDashboardData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, charts, report, users
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);

  // Chart refs
  const timeSeriesCanvasRef = useRef(null);
  const typeDistributionCanvasRef = useRef(null);
  const userActivityCanvasRef = useRef(null);

  // Load dashboard data on mount and time range change
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  // Load user analytics when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserAnalytics(selectedUser);
    }
  }, [selectedUser]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/dashboard?time_range=${timeRange}`
      );
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
        // Draw charts
        setTimeout(() => {
          drawCharts(data.data);
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/report?time_range=${timeRange}&include_insights=true`
      );
      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    }
  };

  const loadUserAnalytics = async (userId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/user/${userId}?time_range=${timeRange}`
      );
      const data = await response.json();

      if (data.success) {
        setUserAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load user analytics:', error);
    }
  };

  const drawCharts = (data) => {
    if (!data) return;

    // Draw time series chart
    drawTimeSeriesChart(data.charts.time_series);

    // Draw type distribution chart
    drawTypeDistributionChart(data.charts.by_type);

    // Draw user activity chart
    drawUserActivityChart(data.charts.top_users);
  };

  const drawTimeSeriesChart = (timeSeriesData) => {
    const canvas = timeSeriesCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!timeSeriesData || timeSeriesData.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    // Find max value for scaling
    const maxValue = Math.max(...timeSeriesData.map(d => d.count));
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw line chart
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();

    timeSeriesData.forEach((point, index) => {
      const x = padding + (index / (timeSeriesData.length - 1)) * chartWidth;
      const y = height - padding - (point.count / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#667eea';
    timeSeriesData.forEach((point, index) => {
      const x = padding + (index / (timeSeriesData.length - 1)) * chartWidth;
      const y = height - padding - (point.count / maxValue) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * i);
      const y = height - padding - (i / 5) * chartHeight;
      ctx.fillText(value.toString(), padding - 20, y + 4);
    }

    // X-axis labels (show first, middle, last)
    if (timeSeriesData.length > 0) {
      const firstLabel = timeSeriesData[0].time.slice(11, 16) || timeSeriesData[0].time.slice(5, 10);
      const lastLabel = timeSeriesData[timeSeriesData.length - 1].time.slice(11, 16) ||
                       timeSeriesData[timeSeriesData.length - 1].time.slice(5, 10);

      ctx.fillText(firstLabel, padding, height - padding + 20);
      ctx.fillText(lastLabel, width - padding, height - padding + 20);
    }
  };

  const drawTypeDistributionChart = (typeData) => {
    const canvas = typeDistributionCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!typeData || typeData.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    // Draw pie chart
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = Math.min(width, height) / 2 - 60;

    const total = typeData.reduce((sum, item) => sum + item.count, 0);
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0'
    ];

    let currentAngle = -Math.PI / 2;

    typeData.forEach((item, index) => {
      const sliceAngle = (item.count / total) * Math.PI * 2;
      const color = colors[index % colors.length];

      // Draw slice
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.count.toString(), labelX, labelY);

      currentAngle += sliceAngle;
    });

    // Draw legend
    const legendX = 10;
    let legendY = height - (typeData.length * 25) - 10;

    typeData.forEach((item, index) => {
      const color = colors[index % colors.length];

      // Color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 15, 15);

      // Label
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${item.type} (${((item.count / total) * 100).toFixed(1)}%)`,
        legendX + 20,
        legendY + 12
      );

      legendY += 25;
    });
  };

  const drawUserActivityChart = (userData) => {
    const canvas = userActivityCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!userData || userData.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    // Draw horizontal bar chart
    const padding = 40;
    const barHeight = 30;
    const spacing = 10;
    const maxValue = Math.max(...userData.map(d => d.count));

    userData.forEach((user, index) => {
      const barWidth = ((user.count / maxValue) * (width - padding * 2));
      const y = padding + index * (barHeight + spacing);

      // Draw bar
      const gradient = ctx.createLinearGradient(padding, 0, padding + barWidth, 0);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');

      ctx.fillStyle = gradient;
      ctx.fillRect(padding, y, barWidth, barHeight);

      // Draw user label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      const userName = user.user.length > 15 ? user.user.substring(0, 12) + '...' : user.user;
      ctx.fillText(userName, padding + 5, y + barHeight / 2 + 4);

      // Draw count
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(user.count.toString(), padding + barWidth - 5, y + barHeight / 2 + 4);
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('tr-TR');
  };

  // Render overview tab
  const renderOverview = () => {
    if (!dashboardData) return <div className="loading">Yükleniyor...</div>;

    const { summary, statistics } = dashboardData;

    return (
      <div className="overview-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{formatNumber(summary.total_events)}</div>
              <div className="stat-label">Toplam Etkinlik</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{formatNumber(summary.unique_users)}</div>
              <div className="stat-label">Aktif Kullanıcı</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{summary.avg_events_per_user.toFixed(1)}</div>
              <div className="stat-label">Kullanıcı Başına Etkinlik</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-value">{summary.peak_hour ? summary.peak_hour.slice(11, 16) : 'N/A'}</div>
              <div className="stat-label">Yoğun Saat</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">{formatNumber(statistics.total)}</div>
              <div className="stat-label">Toplam Değer</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.mean.toFixed(1)}</div>
              <div className="stat-label">Ortalama Değer</div>
            </div>
          </div>
        </div>

        <div className="quick-insights">
          <h3>Hızlı Bilgiler</h3>
          <div className="insight-grid">
            <div className="insight-item">
              <span className="insight-label">En Yüksek Değer:</span>
              <span className="insight-value">{statistics.max.toFixed(2)}</span>
            </div>
            <div className="insight-item">
              <span className="insight-label">En Düşük Değer:</span>
              <span className="insight-value">{statistics.min.toFixed(2)}</span>
            </div>
            <div className="insight-item">
              <span className="insight-label">Medyan:</span>
              <span className="insight-value">{statistics.median.toFixed(2)}</span>
            </div>
            {statistics.stdev && (
              <div className="insight-item">
                <span className="insight-label">Standart Sapma:</span>
                <span className="insight-value">{statistics.stdev.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render charts tab
  const renderCharts = () => {
    return (
      <div className="charts-section">
        <div className="chart-container">
          <h3>Zaman Serisi Analizi</h3>
          <canvas
            ref={timeSeriesCanvasRef}
            width={800}
            height={300}
            className="analytics-canvas"
          />
        </div>

        <div className="chart-row">
          <div className="chart-container">
            <h3>Etkinlik Türü Dağılımı</h3>
            <canvas
              ref={typeDistributionCanvasRef}
              width={400}
              height={350}
              className="analytics-canvas"
            />
          </div>

          <div className="chart-container">
            <h3>En Aktif Kullanıcılar (Top 10)</h3>
            <canvas
              ref={userActivityCanvasRef}
              width={400}
              height={350}
              className="analytics-canvas"
            />
          </div>
        </div>

        {dashboardData && dashboardData.charts.top_tags.length > 0 && (
          <div className="chart-container">
            <h3>Popüler Etiketler</h3>
            <div className="tag-cloud">
              {dashboardData.charts.top_tags.map((tag, index) => (
                <div
                  key={index}
                  className="tag-bubble"
                  style={{
                    fontSize: `${12 + (tag.count / 10)}px`,
                    opacity: 0.6 + (tag.count / 100)
                  }}
                >
                  {tag.tag} ({tag.count})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render report tab
  const renderReport = () => {
    if (!report) {
      return (
        <div className="report-section">
          <button className="btn-primary" onClick={loadReport}>
            Rapor Oluştur
          </button>
        </div>
      );
    }

    return (
      <div className="report-section">
        <div className="report-header">
          <h3>Analitik Raporu</h3>
          <div className="report-meta">
            <span>Oluşturulma: {formatDate(report.generated_at)}</span>
            <span>Zaman Aralığı: {TIME_RANGES.find(r => r.value === report.time_range)?.label}</span>
          </div>
        </div>

        {report.insights && report.insights.length > 0 && (
          <div className="report-section-box">
            <h4>💡 Önemli Bulgular</h4>
            <ul className="insights-list">
              {report.insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </div>
        )}

        {report.recommendations && report.recommendations.length > 0 && (
          <div className="report-section-box">
            <h4>🎯 Öneriler</h4>
            <ul className="recommendations-list">
              {report.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn-secondary" onClick={loadReport}>
          Raporu Yenile
        </button>
      </div>
    );
  };

  // Render users tab
  const renderUsers = () => {
    if (!dashboardData) return null;

    const topUsers = dashboardData.charts.top_users;

    return (
      <div className="users-section">
        <h3>Kullanıcı Analitiği</h3>

        <div className="users-list">
          {topUsers.map((user, index) => (
            <div
              key={index}
              className={`user-item ${selectedUser === user.user ? 'selected' : ''}`}
              onClick={() => setSelectedUser(user.user)}
            >
              <div className="user-rank">#{index + 1}</div>
              <div className="user-info">
                <div className="user-name">{user.user}</div>
                <div className="user-stats">
                  <span>{user.count} etkinlik</span>
                  <span>Değer: {user.value.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedUser && userAnalytics && (
          <div className="user-analytics-detail">
            <h4>Detaylı Kullanıcı Analizi: {selectedUser}</h4>

            <div className="user-stats-grid">
              <div className="user-stat">
                <span className="label">Toplam Etkinlik:</span>
                <span className="value">{userAnalytics.total_events}</span>
              </div>
              <div className="user-stat">
                <span className="label">İlk Aktivite:</span>
                <span className="value">{formatDate(userAnalytics.first_activity)}</span>
              </div>
              <div className="user-stat">
                <span className="label">Son Aktivite:</span>
                <span className="value">{formatDate(userAnalytics.last_activity)}</span>
              </div>
            </div>

            {Object.keys(userAnalytics.activity_by_type).length > 0 && (
              <div className="user-activity-breakdown">
                <h5>Etkinlik Türleri:</h5>
                <div className="activity-type-list">
                  {Object.entries(userAnalytics.activity_by_type).map(([type, count]) => (
                    <div key={type} className="activity-type-item">
                      <span className="type-name">{type}</span>
                      <span className="type-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="advanced-analytics">
      <div className="analytics-header">
        <h2>Gelişmiş Analitik Dashboard</h2>

        <div className="analytics-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-selector"
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          <button className="btn-refresh" onClick={loadDashboardData}>
            🔄 Yenile
          </button>
        </div>
      </div>

      <div className="analytics-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Genel Bakış
        </button>
        <button
          className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          📈 Grafikler
        </button>
        <button
          className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📄 Rapor
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Kullanıcılar
        </button>
      </div>

      <div className="analytics-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Analitik verileri yükleniyor...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'charts' && renderCharts()}
            {activeTab === 'report' && renderReport()}
            {activeTab === 'users' && renderUsers()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
