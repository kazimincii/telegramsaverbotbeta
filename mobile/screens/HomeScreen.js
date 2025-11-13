import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDownloads } from '../services/DownloadService';
import { apiClient } from '../services/ApiService';

export default function HomeScreen() {
  const { downloads } = useDownloads();
  const [stats, setStats] = useState({});

  useEffect(() => {
    apiClient.get('/api/downloads/statistics')
      .then(res => setStats(res.data.statistics))
      .catch(err => console.error(err));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Telegram Saver</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Ionicons name="download-outline" size={24} color="#667eea" />
          <Text style={styles.statValue}>{stats.total_downloads || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.completed_downloads || 0}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#667eea' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  stats: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
});
