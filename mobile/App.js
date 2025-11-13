/**
 * Telegram Saver Mobile App
 * Cross-platform mobile app for iOS and Android
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';

import AppNavigator from './navigation/AppNavigator';
import AuthNavigator from './navigation/AuthNavigator';
import { ApiProvider } from './services/ApiService';
import { AuthProvider, useAuth } from './services/AuthService';
import { DownloadProvider } from './services/DownloadService';
import { NotificationService } from './services/NotificationService';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  return (
    <SafeAreaProvider>
      <ApiProvider>
        <AuthProvider>
          <DownloadProvider>
            <AppContent />
          </DownloadProvider>
        </AuthProvider>
      </ApiProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Initialize app
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');

      // Initialize notification service
      if (status === 'granted') {
        await NotificationService.initialize();
      }

      // Check biometric support
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
        if (biometricEnabled === 'true') {
          // Biometric authentication will be handled by AuthService
        }
      }
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  if (isLoading) {
    return null; // Show splash screen
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
