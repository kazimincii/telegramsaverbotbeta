import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class NotificationService {
  static async initialize() {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return;
    }

    // Get notification token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await AsyncStorage.setItem('push_token', token);

    // Configure notification channel (Android)
    if (Device.osName === 'Android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#667eea',
      });
    }

    return token;
  }

  static async sendNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }

  static async scheduleNotification(title, body, trigger, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }
}
