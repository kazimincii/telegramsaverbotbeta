import React, { useState, useEffect } from "react";
import ControlPanel from "./components/ControlPanel";
import ThemeToggle from "./components/ThemeToggle";
import CLIPSearchPanel from "./components/CLIPSearchPanel";
import WebhookManager from "./components/WebhookManager";
import CloudSyncSettings from "./components/CloudSyncSettings";
import VideoProcessor from "./components/VideoProcessor";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import LanguageSelector, { LanguageProvider } from "./components/LanguageSelector";
import EnterpriseManager from "./components/EnterpriseManager";
import OfflineIndicator from "./components/OfflineIndicator";
import AIAssistant from "./components/AIAssistant";
import ContentSummary from "./components/ContentSummary";
import { AppProvider } from "./context/AppContext";
import "./styles/modern.css";

export default function App(){
  const [activeView, setActiveView] = useState('control');
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Setup keyboard shortcut listeners
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onShortcutAction) {
      const handleShortcut = (action) => {
        console.log('Shortcut action received:', action);

        switch (action) {
          case 'start-download':
            setActiveView('control');
            break;

          case 'open-settings':
            setActiveView('control');
            break;

          case 'refresh':
            window.location.reload();
            break;

          default:
            console.log('Unknown shortcut action:', action);
        }
      };

      window.electronAPI.onShortcutAction(handleShortcut);

      return () => {
        if (window.electronAPI.removeShortcutActionListener) {
          window.electronAPI.removeShortcutActionListener();
        }
      };
    }
  }, []);

  const menuItems = [
    { id: 'control', label: 'Kontrol Paneli', icon: '🎛️' },
    { id: 'ai', label: 'AI Asistan', icon: '🤖' },
    { id: 'summary', label: 'İçerik Özetleme', icon: '📝' },
    { id: 'analytics', label: 'Analitik', icon: '📊' },
    { id: 'search', label: 'AI Arama', icon: '🔍' },
    { id: 'webhook', label: 'Webhook', icon: '🔗' },
    { id: 'cloud', label: 'Bulut Senkronizasyon', icon: '☁️' },
    { id: 'video', label: 'Video İşleme', icon: '🎥' },
    { id: 'enterprise', label: 'Kurumsal', icon: '🏢' }
  ];

  return (
    <LanguageProvider>
      <AppProvider>
        <div className="app-container">
          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-header">
              <h2 className="sidebar-title">Telegram Saver</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-icon"
                  onClick={toggleTheme}
                  title={theme === 'light' ? 'Karanlık Mod' : 'Aydınlık Mod'}
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <LanguageSelector />
              </div>
            </div>

            <nav className="sidebar-nav">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => setActiveView(item.id)}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-item-text">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="text-small text-muted">
                v1.0.0 - © 2025 Telegram Saver
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="main-content">
            <div className="content-wrapper">
              {activeView === 'control' && <ControlPanel />}
              {activeView === 'ai' && <AIAssistant />}
              {activeView === 'summary' && <ContentSummary />}
              {activeView === 'analytics' && <AnalyticsDashboard />}
              {activeView === 'search' && <CLIPSearchPanel />}
              {activeView === 'webhook' && <WebhookManager />}
              {activeView === 'cloud' && <CloudSyncSettings />}
              {activeView === 'video' && <VideoProcessor />}
              {activeView === 'enterprise' && <EnterpriseManager />}
            </div>
          </div>

          {/* Offline Indicator */}
          <OfflineIndicator />
        </div>
      </AppProvider>
    </LanguageProvider>
  );
}
