import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  useColorScheme,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const DEFAULT_API_URL = 'http://192.168.1.100:8000';

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'settings', 'stats'

  // Load settings
  useEffect(() => {
    loadSettings();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [apiUrl]);

  const loadSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('apiUrl');
      if (savedUrl) setApiUrl(savedUrl);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('apiUrl', apiUrl);
      Alert.alert('Success', 'API URL saved successfully!');
      fetchStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const fetchStatus = async () => {
    if (!apiUrl) return;

    try {
      const response = await axios.get(`${apiUrl}/api/status`, { timeout: 3000 });
      setStatus(response.data);
      setConnected(true);
    } catch (error) {
      setConnected(false);
      console.error('Error fetching status:', error.message);
    }
  };

  const startDownload = async () => {
    setLoading(true);
    try {
      await axios.post(`${apiUrl}/api/start`);
      Alert.alert('Success', 'Download started!');
      setTimeout(fetchStatus, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to start download: ' + error.message);
    }
    setLoading(false);
  };

  const stopDownload = async () => {
    setLoading(true);
    try {
      await axios.post(`${apiUrl}/api/stop`);
      Alert.alert('Success', 'Download stopped!');
      setTimeout(fetchStatus, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop download: ' + error.message);
    }
    setLoading(false);
  };

  const styles = getStyles(isDark);

  // Home Screen
  const HomeScreen = () => (
    <ScrollView style={styles.screen}>
      {/* Connection Status */}
      <View style={styles.card}>
        <View style={styles.statusHeader}>
          <Text style={styles.cardTitle}>Connection Status</Text>
          <View style={[styles.statusDot, connected ? styles.statusConnected : styles.statusDisconnected]} />
        </View>
        <Text style={styles.statusText}>
          {connected ? 'Connected to backend' : 'Not connected'}
        </Text>
        <Text style={styles.apiUrlText}>{apiUrl}</Text>
      </View>

      {/* Download Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Download Control</Text>

        {status?.running ? (
          <>
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Status: Running</Text>
              <ActivityIndicator size="large" color="#4CAF50" style={styles.spinner} />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{status?.progress?.downloaded || 0}</Text>
                <Text style={styles.statLabel}>Downloaded</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{status?.progress?.skipped || 0}</Text>
                <Text style={styles.statLabel}>Skipped</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{status?.progress?.errors || 0}</Text>
                <Text style={styles.statLabel}>Errors</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopDownload}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Stopping...' : '⏹ Stop Download'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.infoText}>Ready to download media from Telegram</Text>
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startDownload}
              disabled={loading || !connected}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Starting...' : '▶️ Start Download'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Recent Activity */}
      {status?.recent_files && status.recent_files.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Downloads</Text>
          {status.recent_files.slice(0, 5).map((file, idx) => (
            <View key={idx} style={styles.fileItem}>
              <Text style={styles.fileName} numberOfLines={1}>{file.name || 'Unknown'}</Text>
              <Text style={styles.fileSize}>{formatBytes(file.size || 0)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // Statistics Screen
  const StatsScreen = () => (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistics</Text>
        {connected && status ? (
          <View style={styles.statsGrid}>
            <View style={styles.statItemLarge}>
              <Text style={styles.statValueLarge}>{status.total_downloads || 0}</Text>
              <Text style={styles.statLabel}>Total Downloads</Text>
            </View>
            <View style={styles.statItemLarge}>
              <Text style={styles.statValueLarge}>{formatBytes(status.total_size || 0)}</Text>
              <Text style={styles.statLabel}>Total Size</Text>
            </View>
            <View style={styles.statItemLarge}>
              <Text style={styles.statValueLarge}>{status.active_chats || 0}</Text>
              <Text style={styles.statLabel}>Active Chats</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.infoText}>Connect to backend to see statistics</Text>
        )}
      </View>
    </ScrollView>
  );

  // Settings Screen
  const SettingsScreen = () => (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend Configuration</Text>

        <Text style={styles.label}>API URL</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.100:8000"
          placeholderTextColor={isDark ? '#888' : '#ccc'}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.helpText}>
          Enter your backend server IP address and port. Make sure the backend is running and accessible from your mobile device.
        </Text>

        <TouchableOpacity style={styles.button} onPress={saveSettings}>
          <Text style={styles.buttonText}>💾 Save Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={fetchStatus}
        >
          <Text style={styles.buttonText}>🔄 Test Connection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.infoText}>
          Telegram Saver Mobile v1.0.0{'\n\n'}
          Monitor and control your Telegram media downloads from anywhere on your local network.
        </Text>
      </View>
    </ScrollView>
  );

  // Main Render
  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Telegram Saver</Text>
      </View>

      {/* Content */}
      {activeTab === 'home' && <HomeScreen />}
      {activeTab === 'stats' && <StatsScreen />}
      {activeTab === 'settings' && <SettingsScreen />}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'home' && styles.navButtonActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navButtonText, activeTab === 'home' && styles.navButtonTextActive]}>
            🏠 Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'stats' && styles.navButtonActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.navButtonText, activeTab === 'stats' && styles.navButtonTextActive]}>
            📊 Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, activeTab === 'settings' && styles.navButtonActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.navButtonText, activeTab === 'settings' && styles.navButtonTextActive]}>
            ⚙️ Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Helper Functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Styles
function getStyles(isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#f5f5f5',
    },
    header: {
      backgroundColor: isDark ? '#1e1e1e' : '#2196F3',
      padding: 16,
      paddingTop: StatusBar.currentHeight || 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#fff',
    },
    screen: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#333',
      marginBottom: 12,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    statusConnected: {
      backgroundColor: '#4CAF50',
    },
    statusDisconnected: {
      backgroundColor: '#f44336',
    },
    statusText: {
      fontSize: 14,
      color: isDark ? '#bbb' : '#666',
      marginBottom: 4,
    },
    apiUrlText: {
      fontSize: 12,
      color: isDark ? '#888' : '#999',
      fontFamily: 'monospace',
    },
    progressContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    progressLabel: {
      fontSize: 16,
      color: isDark ? '#fff' : '#333',
      fontWeight: '600',
      marginBottom: 8,
    },
    spinner: {
      marginVertical: 8,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 16,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statItemLarge: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: 12,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#4CAF50' : '#2196F3',
    },
    statValueLarge: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#4CAF50' : '#2196F3',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? '#999' : '#666',
      marginTop: 4,
    },
    infoText: {
      fontSize: 14,
      color: isDark ? '#bbb' : '#666',
      marginBottom: 16,
      lineHeight: 20,
    },
    button: {
      backgroundColor: '#2196F3',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 12,
    },
    startButton: {
      backgroundColor: '#4CAF50',
    },
    stopButton: {
      backgroundColor: '#f44336',
    },
    testButton: {
      backgroundColor: '#FF9800',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    fileItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#eee',
    },
    fileName: {
      flex: 1,
      fontSize: 14,
      color: isDark ? '#fff' : '#333',
      marginRight: 8,
    },
    fileSize: {
      fontSize: 12,
      color: isDark ? '#888' : '#999',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#333',
      marginBottom: 8,
    },
    input: {
      backgroundColor: isDark ? '#2a2a2a' : '#f9f9f9',
      borderWidth: 1,
      borderColor: isDark ? '#444' : '#ddd',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: isDark ? '#fff' : '#333',
      marginBottom: 8,
    },
    helpText: {
      fontSize: 12,
      color: isDark ? '#888' : '#999',
      marginBottom: 16,
      lineHeight: 18,
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#333' : '#eee',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    navButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    navButtonActive: {
      borderTopWidth: 3,
      borderTopColor: '#2196F3',
    },
    navButtonText: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
    },
    navButtonTextActive: {
      color: isDark ? '#2196F3' : '#2196F3',
      fontWeight: 'bold',
    },
  });
}
