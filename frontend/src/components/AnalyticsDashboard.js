import React, { useState, useEffect } from "react";

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d"); // 7d, 30d, all

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/status");
      const data = await response.json();

      // Simulate advanced stats (in production, these would come from backend analytics API)
      const advancedStats = {
        totalDownloads: data.progress?.downloaded || 0,
        totalSkipped: data.progress?.skipped || 0,
        totalErrors: data.progress?.errors || 0,
        totalSize: Math.floor(Math.random() * 10000000000), // Mock
        avgFileSize: Math.floor(Math.random() * 5000000), // Mock
        downloadSpeed: data.running ? Math.floor(Math.random() * 1000000) : 0, // Mock
        activeChats: Math.floor(Math.random() * 50), // Mock
        uptime: formatUptime(Date.now() - (Math.random() * 86400000)), // Mock
        mediaTypes: {
          photos: Math.floor(Math.random() * 500),
          videos: Math.floor(Math.random() * 200),
          documents: Math.floor(Math.random() * 100),
          audio: Math.floor(Math.random() * 50),
        },
        hourlyActivity: generateMockHourlyData(),
        topChats: generateMockTopChats(),
      };

      setStats(advancedStats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  const generateMockHourlyData = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      downloads: Math.floor(Math.random() * 100),
    }));
  };

  const generateMockTopChats = () => {
    const chatNames = ["Tech News", "Photography", "Movies", "Music", "Books"];
    return chatNames.map((name, i) => ({
      name,
      downloads: Math.floor(Math.random() * 500) + 100,
      size: Math.floor(Math.random() * 1000000000) + 100000000,
    }));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>📊 Analytics Dashboard</h2>
        <p style={styles.loading}>Loading statistics...</p>
      </div>
    );
  }

  const successRate =
    stats.totalDownloads + stats.totalErrors > 0
      ? (
          (stats.totalDownloads /
            (stats.totalDownloads + stats.totalErrors)) *
          100
        ).toFixed(1)
      : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📊 Analytics Dashboard</h2>
        <div style={styles.timeRangeButtons}>
          <button
            onClick={() => setTimeRange("7d")}
            style={{
              ...styles.timeButton,
              ...(timeRange === "7d" ? styles.timeButtonActive : {}),
            }}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange("30d")}
            style={{
              ...styles.timeButton,
              ...(timeRange === "30d" ? styles.timeButtonActive : {}),
            }}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange("all")}
            style={{
              ...styles.timeButton,
              ...(timeRange === "all" ? styles.timeButtonActive : {}),
            }}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>📥</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{stats.totalDownloads}</div>
            <div style={styles.metricLabel}>Total Downloads</div>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>💾</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{formatBytes(stats.totalSize)}</div>
            <div style={styles.metricLabel}>Total Storage</div>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>✓</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{successRate}%</div>
            <div style={styles.metricLabel}>Success Rate</div>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>⚡</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>
              {formatBytes(stats.downloadSpeed)}/s
            </div>
            <div style={styles.metricLabel}>Download Speed</div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div style={styles.secondaryMetrics}>
        <div style={styles.secondaryMetricItem}>
          <span style={styles.secondaryLabel}>Avg File Size:</span>
          <span style={styles.secondaryValue}>
            {formatBytes(stats.avgFileSize)}
          </span>
        </div>
        <div style={styles.secondaryMetricItem}>
          <span style={styles.secondaryLabel}>Active Chats:</span>
          <span style={styles.secondaryValue}>{stats.activeChats}</span>
        </div>
        <div style={styles.secondaryMetricItem}>
          <span style={styles.secondaryLabel}>Skipped:</span>
          <span style={styles.secondaryValue}>{stats.totalSkipped}</span>
        </div>
        <div style={styles.secondaryMetricItem}>
          <span style={styles.secondaryLabel}>Errors:</span>
          <span style={styles.secondaryValue}>{stats.totalErrors}</span>
        </div>
        <div style={styles.secondaryMetricItem}>
          <span style={styles.secondaryLabel}>Uptime:</span>
          <span style={styles.secondaryValue}>{stats.uptime}</span>
        </div>
      </div>

      {/* Media Types Distribution */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📁 Media Types Distribution</h3>
        <div style={styles.mediaTypesGrid}>
          {Object.entries(stats.mediaTypes).map(([type, count]) => {
            const total = Object.values(stats.mediaTypes).reduce(
              (a, b) => a + b,
              0
            );
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

            return (
              <div key={type} style={styles.mediaTypeCard}>
                <div style={styles.mediaTypeHeader}>
                  <span style={styles.mediaTypeIcon}>
                    {getMediaIcon(type)}
                  </span>
                  <span style={styles.mediaTypeName}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </div>
                <div style={styles.mediaTypeCount}>{count}</div>
                <div style={styles.mediaTypeBar}>
                  <div
                    style={{
                      ...styles.mediaTypeBarFill,
                      width: `${percentage}%`,
                    }}
                  />
                </div>
                <div style={styles.mediaTypePercentage}>{percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Activity Chart */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📈 Hourly Download Activity</h3>
        <div style={styles.chartContainer}>
          {stats.hourlyActivity.map((data) => {
            const maxDownloads = Math.max(
              ...stats.hourlyActivity.map((d) => d.downloads)
            );
            const barHeight = maxDownloads > 0 ? (data.downloads / maxDownloads) * 150 : 0;

            return (
              <div key={data.hour} style={styles.chartBar}>
                <div
                  style={{
                    ...styles.chartBarFill,
                    height: `${barHeight}px`,
                  }}
                  title={`${data.hour}:00 - ${data.downloads} downloads`}
                />
                <div style={styles.chartBarLabel}>
                  {data.hour.toString().padStart(2, "0")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Chats */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏆 Top Active Chats</h3>
        <div style={styles.topChatsList}>
          {stats.topChats
            .sort((a, b) => b.downloads - a.downloads)
            .map((chat, index) => (
              <div key={index} style={styles.topChatItem}>
                <div style={styles.topChatRank}>#{index + 1}</div>
                <div style={styles.topChatInfo}>
                  <div style={styles.topChatName}>{chat.name}</div>
                  <div style={styles.topChatStats}>
                    {chat.downloads} downloads • {formatBytes(chat.size)}
                  </div>
                </div>
                <div style={styles.topChatBar}>
                  <div
                    style={{
                      ...styles.topChatBarFill,
                      width: `${(chat.downloads / stats.topChats[0].downloads) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* System Info */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💻 System Information</h3>
        <div style={styles.systemInfo}>
          <div style={styles.systemInfoItem}>
            <span style={styles.systemInfoLabel}>Platform:</span>
            <span style={styles.systemInfoValue}>
              {navigator.platform || "Unknown"}
            </span>
          </div>
          <div style={styles.systemInfoItem}>
            <span style={styles.systemInfoLabel}>Browser:</span>
            <span style={styles.systemInfoValue}>
              {getBrowserName()}
            </span>
          </div>
          <div style={styles.systemInfoItem}>
            <span style={styles.systemInfoLabel}>Session Start:</span>
            <span style={styles.systemInfoValue}>
              {new Date().toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Functions
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getMediaIcon(type) {
  const icons = {
    photos: "📷",
    videos: "🎬",
    documents: "📄",
    audio: "🎵",
  };
  return icons[type] || "📁";
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Unknown";
}

// Styles
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
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
  },
  title: {
    fontSize: "24px",
    margin: 0,
    color: "var(--text-primary, #333)",
  },
  timeRangeButtons: {
    display: "flex",
    gap: "8px",
  },
  timeButton: {
    padding: "8px 16px",
    fontSize: "14px",
    border: "1px solid var(--border-color, #ddd)",
    borderRadius: "4px",
    backgroundColor: "white",
    color: "var(--text-primary, #333)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  timeButtonActive: {
    backgroundColor: "#2196F3",
    color: "white",
    borderColor: "#2196F3",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    color: "var(--text-secondary, #666)",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    marginBottom: "20px",
  },
  metricCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  metricIcon: {
    fontSize: "32px",
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "var(--text-primary, #333)",
  },
  metricLabel: {
    fontSize: "12px",
    color: "var(--text-secondary, #666)",
    marginTop: "4px",
  },
  secondaryMetrics: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    padding: "15px 20px",
    backgroundColor: "white",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  secondaryMetricItem: {
    display: "flex",
    gap: "8px",
  },
  secondaryLabel: {
    fontSize: "14px",
    color: "var(--text-secondary, #666)",
  },
  secondaryValue: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "var(--text-primary, #333)",
  },
  section: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "20px",
    color: "var(--text-primary, #333)",
  },
  mediaTypesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
  },
  mediaTypeCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  mediaTypeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  mediaTypeIcon: {
    fontSize: "20px",
  },
  mediaTypeName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary, #333)",
  },
  mediaTypeCount: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#2196F3",
  },
  mediaTypeBar: {
    height: "8px",
    backgroundColor: "var(--bg-secondary, #f5f5f5)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  mediaTypeBarFill: {
    height: "100%",
    backgroundColor: "#2196F3",
    transition: "width 0.3s",
  },
  mediaTypePercentage: {
    fontSize: "12px",
    color: "var(--text-secondary, #666)",
  },
  chartContainer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "180px",
    gap: "4px",
  },
  chartBar: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
  },
  chartBarFill: {
    width: "100%",
    backgroundColor: "#2196F3",
    borderRadius: "4px 4px 0 0",
    transition: "height 0.3s",
    minHeight: "2px",
  },
  chartBarLabel: {
    fontSize: "10px",
    color: "var(--text-secondary, #666)",
  },
  topChatsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  topChatItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  topChatRank: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#2196F3",
    minWidth: "30px",
  },
  topChatInfo: {
    flex: 1,
  },
  topChatName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary, #333)",
  },
  topChatStats: {
    fontSize: "12px",
    color: "var(--text-secondary, #666)",
    marginTop: "2px",
  },
  topChatBar: {
    flex: 1,
    height: "6px",
    backgroundColor: "var(--bg-secondary, #f5f5f5)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  topChatBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    transition: "width 0.3s",
  },
  systemInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  systemInfoItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px",
    backgroundColor: "var(--bg-secondary, #f9f9f9)",
    borderRadius: "4px",
  },
  systemInfoLabel: {
    fontSize: "14px",
    color: "var(--text-secondary, #666)",
  },
  systemInfoValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary, #333)",
  },
};
