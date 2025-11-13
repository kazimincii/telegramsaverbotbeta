import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../services/AuthService';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    const result = await login(username, password);
    if (!result.success) alert(result.error || 'Login failed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Telegram Saver</Text>
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#667eea' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: '#764ba2', padding: 16, borderRadius: 8, marginTop: 12 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16, textAlign: 'center' },
});
