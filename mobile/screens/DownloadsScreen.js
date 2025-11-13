import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useDownloads } from '../services/DownloadService';

export default function DownloadsScreen() {
  const { downloads } = useDownloads();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Downloads</Text>
      </View>
      <FlatList
        data={downloads}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.filename}>{item.filename}</Text>
            <Text>Progress: {Math.round(item.progress || 0)}%</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#667eea' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  card: { backgroundColor: 'white', margin: 16, padding: 16, borderRadius: 8 },
  filename: { fontSize: 16, fontWeight: '500' },
});
