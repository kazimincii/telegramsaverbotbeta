import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../services/AuthService';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.section}>
        <Text>User: {user?.username || 'Guest'}</Text>
        <TouchableOpacity style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#667eea' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  section: { padding: 16 },
  button: { backgroundColor: '#ef4444', padding: 16, borderRadius: 8, marginTop: 16 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
});
