import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function App() {
  const [status, setStatus] = useState(null);
  const [downloads, setDownloads] = useState([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const startDownload = async () => {
    try {
      await axios.post(`${API_URL}/api/start`);
      fetchStatus();
    } catch (error) {
      console.error('Error starting download:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Telegram Saver Mobile</Text>
      <Button title="Start Download" onPress={startDownload} />
      <Text style={styles.status}>
        Status: {status?.running ? 'Running' : 'Stopped'}
      </Text>
      <Text>Downloaded: {status?.progress?.downloaded || 0}</Text>
      <Text>Skipped: {status?.progress?.skipped || 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 18,
    marginTop: 20,
  },
});
