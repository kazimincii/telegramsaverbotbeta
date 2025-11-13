# Telegram Saver Mobile App

Cross-platform mobile application for iOS and Android built with React Native and Expo.

## Features

✅ **All Desktop Features (Mobile-Optimized)**
- Download management with queue
- Media preview (videos, images, documents)
- Cloud sync with desktop app
- AI-powered search and tagging
- Advanced filtering
- Offline mode

✅ **Mobile-Specific Features**
- Background downloads
- Push notifications
- Share extension (save from other apps)
- Biometric authentication (Face ID / Fingerprint)
- QR code scanner for quick login
- Home screen widgets
- Dark mode support
- Responsive design

✅ **Platform Support**
- iOS 13.0+
- Android 5.0+ (API Level 21+)
- Expo managed workflow

## Project Structure

```
mobile/
├── App.js                 # Main app entry point
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── assets/               # Images, fonts, icons
├── components/           # Reusable UI components
│   ├── DownloadCard.js
│   ├── MediaPreview.js
│   ├── SearchBar.js
│   └── ...
├── screens/              # App screens
│   ├── HomeScreen.js
│   ├── DownloadsScreen.js
│   ├── SettingsScreen.js
│   ├── LoginScreen.js
│   └── ...
├── navigation/           # Navigation configuration
│   ├── AppNavigator.js   # Main app navigation
│   └── AuthNavigator.js  # Auth flow navigation
├── services/             # API and business logic
│   ├── ApiService.js     # HTTP client
│   ├── AuthService.js    # Authentication
│   ├── DownloadService.js
│   ├── NotificationService.js
│   ├── SyncService.js
│   └── ...
└── utils/                # Helper functions
    ├── formatters.js
    ├── validators.js
    └── constants.js
```

## Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Development

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode 14+ (macOS only)
- Android: Android Studio + Android SDK

### Environment Variables
Create `.env` file:
```
API_BASE_URL=http://localhost:8000
API_TIMEOUT=30000
```

### Building for Production

**iOS:**
```bash
expo build:ios
```

**Android:**
```bash
expo build:android
```

## Key Dependencies

- **expo**: ~50.0.0 - Expo SDK
- **react-navigation**: ^6.1.9 - Navigation
- **axios**: ^1.6.5 - HTTP client
- **expo-notifications**: ~0.27.6 - Push notifications
- **expo-local-authentication**: ~13.8.0 - Biometric auth
- **expo-file-system**: ~16.0.6 - File management
- **expo-background-fetch**: ~12.0.1 - Background tasks
- **expo-secure-store**: ~12.8.1 - Secure storage
- **expo-sharing**: ~12.0.1 - Share extension
- **expo-camera**: ~14.1.3 - QR scanner

## Features in Detail

### Background Downloads
- Continue downloads when app is backgrounded
- Progress notifications
- Automatic retry on failure
- Queue management

### Push Notifications
- Download completion alerts
- Sync status updates
- Error notifications
- Configurable notification settings

### Share Extension
- Save content from other apps
- Quick share to Telegram Saver
- Automatic categorization

### Biometric Authentication
- Face ID (iOS)
- Touch ID (iOS)
- Fingerprint (Android)
- Fallback to PIN/Password

### Cloud Sync
- Real-time sync with desktop app
- E2E encryption
- Conflict resolution
- Offline queue

### Offline Mode
- Download for offline viewing
- Queue sync when online
- Cached media preview
- Local database

## API Integration

Mobile app communicates with desktop backend:

```javascript
// Example API call
import { apiClient } from './services/ApiService';

const downloads = await apiClient.get('/api/downloads/list');
const stats = await apiClient.get('/api/downloads/statistics');
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## Deployment

### App Store (iOS)
1. Build production IPA
2. Upload to App Store Connect
3. Submit for review

### Google Play (Android)
1. Build production APK/AAB
2. Upload to Google Play Console
3. Submit for review

## Monetization

**Free Tier:**
- Basic download features
- 5 concurrent downloads
- 10GB cloud storage

**Premium Subscription** ($4.99/month):
- Unlimited concurrent downloads
- 100GB cloud storage
- Priority sync
- Background downloads
- No ads

## License

Part of Telegram Saver project.

## Support

For issues and feature requests, please open an issue on the main repository.
