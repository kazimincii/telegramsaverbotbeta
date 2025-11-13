import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Search media..."
        value={query}
        onChangeText={setQuery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#667eea' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  input: { margin: 16, padding: 12, backgroundColor: 'white', borderRadius: 8 },
});
