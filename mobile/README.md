# Telegram Saver Mobile

React Native mobile app for monitoring and controlling Telegram media downloads from your phone.

## Features

- ✅ **Real-time monitoring** - Live status updates every 3 seconds
- ✅ **Remote control** - Start/stop downloads from anywhere
- ✅ **Statistics** - View download stats and recent files
- ✅ **Dark mode** - Automatic theme based on system preferences
- ✅ **Cross-platform** - iOS, Android, and Web support
- ✅ **Configurable** - Easy backend URL configuration

## Screenshots

### Home Screen
- Connection status indicator
- Download control buttons
- Real-time progress tracking
- Recent downloads list

### Statistics Screen
- Total downloads count
- Total size downloaded
- Active chats monitoring

### Settings Screen
- Backend API URL configuration
- Connection testing
- App information

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Studio (for emulators)
- Physical device with Expo Go app (recommended)

## Installation

```bash
cd mobile
npm install
```

## Running the App

### Development Mode with Expo Go

```bash
npm start
```

This will start the Expo development server. You can then:

1. **iOS:** Press `i` to open in iOS Simulator (macOS only)
2. **Android:** Press `a` to open in Android Emulator
3. **Physical Device:** Scan QR code with Expo Go app

### Building Standalone Apps

#### Prerequisites
Install EAS CLI:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

#### Build for Android (APK)
```bash
npm run build:android
```

This creates a production APK that can be installed on any Android device.

#### Build for iOS (IPA)
```bash
npm run build:ios
```

**Note:** Building for iOS requires:
- macOS with Xcode
- Apple Developer account ($99/year)
- Valid iOS distribution certificate

## Configuration

### Backend URL Setup

1. Open the app
2. Go to Settings tab (⚙️)
3. Enter your backend server URL (e.g., `http://192.168.1.100:8000`)
4. Tap "Save Settings"
5. Tap "Test Connection" to verify

### Network Requirements

- Backend server must be accessible from mobile device
- For local network: Use computer's local IP (not `localhost`)
- For remote access: Use public IP or domain with proper port forwarding

**Finding your backend IP:**

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig | findstr IPv4
```

## App Structure

```
mobile/
├── App.js              # Main app component with navigation
├── app.json            # Expo configuration
├── package.json        # Dependencies and scripts
└── assets/            # Images and icons
    ├── icon.png       # App icon (1024x1024)
    ├── splash.png     # Splash screen
    └── adaptive-icon.png  # Android adaptive icon
```

## Features Breakdown

### Home Tab
- **Connection Status Card**
  - Real-time connection indicator
  - Backend URL display

- **Download Control Card**
  - Start/Stop buttons
  - Progress indicators
  - Stats: Downloaded, Skipped, Errors

- **Recent Downloads Card**
  - Last 5 downloaded files
  - File names and sizes

### Stats Tab
- Total downloads count
- Total data size
- Active chats count

### Settings Tab
- Backend URL configuration
- Connection testing
- App version info

## API Endpoints Used

- `GET /api/status` - Fetch current status (polled every 3s)
- `POST /api/start` - Start download session
- `POST /api/stop` - Stop download session

## Customization

### Changing Theme Colors

Edit `getStyles()` function in `App.js`:

```javascript
// Primary color
backgroundColor: '#2196F3'

// Success color
backgroundColor: '#4CAF50'

// Error/Stop color
backgroundColor: '#f44336'
```

### Adjusting Poll Interval

Change the polling frequency in `useEffect`:

```javascript
const interval = setInterval(fetchStatus, 3000); // 3 seconds
```

## Troubleshooting

### "Unable to connect" error
- Check backend is running: `curl http://YOUR_IP:8000/api/status`
- Verify firewall allows port 8000
- Ensure devices are on same network

### "Connection refused" on Android
- Android emulator: Use `http://10.0.2.2:8000` instead of `localhost`
- Physical device: Use computer's local IP address

### App crashes on startup
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### iOS simulator not opening
- Install Xcode Command Line Tools: `xcode-select --install`
- Open Xcode once to accept license

## Production Deployment

### Android (Google Play Store)

1. Build production APK:
   ```bash
   eas build --platform android --profile production
   ```

2. Create Google Play Console account

3. Upload APK through console

### iOS (App Store)

1. Build production IPA:
   ```bash
   eas build --platform ios --profile production
   ```

2. Create App Store Connect account

3. Submit through App Store Connect

### Web Deployment

1. Build web version:
   ```bash
   npm run web
   npx expo export:web
   ```

2. Deploy `web-build/` folder to hosting (Netlify, Vercel, etc.)

## Performance Tips

- App uses minimal battery with 3-second polling
- Connection timeout set to 3 seconds for fast failure
- Dark mode reduces OLED screen power consumption
- AsyncStorage caches settings locally

## Security Notes

- API URL stored in AsyncStorage (device only)
- No authentication implemented (local network use only)
- For public internet: Add authentication to backend APIs
- HTTPS recommended for remote access

## License

Part of Telegram Saver Bot project. See main project LICENSE.

## Support

- Backend issues: Check main project README
- Mobile-specific issues: Create issue with "mobile" label
- Feature requests: Open discussion in main repo
