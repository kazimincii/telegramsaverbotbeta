# Desktop App Build Instructions

This guide explains how to build installers for Windows, macOS, and Linux.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python 3.11+** (for backend)
3. **Platform-specific tools:**
   - **Windows:** None required
   - **macOS:** Xcode Command Line Tools
   - **Linux:** `rpm`, `fakeroot`, `dpkg` (for packaging)

## Installation

```bash
cd desktop
npm install
```

## Build Commands

### Development Mode
```bash
npm start
```
Runs the app in development mode (requires backend and frontend to be running separately).

### Production Builds

#### Build for Current Platform
```bash
npm run build
```

#### Build for Specific Platform
```bash
# Windows (NSIS installer + portable)
npm run build:win

# macOS (DMG + ZIP)
npm run build:mac

# Linux (AppImage + deb + rpm + tar.gz)
npm run build:linux
```

#### Build for All Platforms
```bash
npm run build:all
```
⚠️ **Note:** Building for macOS requires macOS. Cross-platform building has limitations.

### Package Without Installer
```bash
npm run pack
```
Creates unpacked application in `dist/` folder (useful for testing).

## Output

Built installers will be in `desktop/dist/` folder:

### Windows
- `Telegram Saver-1.0.0-win-x64.exe` (NSIS installer)
- `Telegram Saver-1.0.0-win-ia32.exe` (32-bit installer)
- `Telegram Saver-1.0.0-win-x64-portable.exe` (portable version)

### macOS
- `Telegram Saver-1.0.0-mac-x64.dmg` (Intel)
- `Telegram Saver-1.0.0-mac-arm64.dmg` (Apple Silicon)
- `Telegram Saver-1.0.0-mac-x64.zip` (Intel)
- `Telegram Saver-1.0.0-mac-arm64.zip` (Apple Silicon)

### Linux
- `Telegram Saver-1.0.0-linux-x64.AppImage`
- `Telegram Saver-1.0.0-linux-arm64.AppImage`
- `telegram-saver-desktop_1.0.0_amd64.deb` (Debian/Ubuntu)
- `telegram-saver-desktop_1.0.0_arm64.deb` (Debian/Ubuntu ARM)
- `telegram-saver-desktop-1.0.0.x86_64.rpm` (RedHat/Fedora)
- `Telegram Saver-1.0.0-linux-x64.tar.gz`
- `Telegram Saver-1.0.0-linux-arm64.tar.gz`

## Resources Folder

The `resources/` folder should contain:

```
desktop/resources/
├── icon.ico          # Windows icon (256x256)
├── icon.icns         # macOS icon bundle
├── icon.png          # Linux icon (512x512)
├── dmg-background.png # macOS DMG background
└── entitlements.mac.plist # macOS entitlements
```

### Creating Icons

**Windows (.ico):**
```bash
# Using ImageMagick
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

**macOS (.icns):**
```bash
# Create iconset
mkdir MyIcon.iconset
sips -z 16 16     icon.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out MyIcon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out MyIcon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out MyIcon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out MyIcon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out MyIcon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out MyIcon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out MyIcon.iconset/icon_512x512@2x.png
iconutil -c icns MyIcon.iconset
```

**Linux (.png):**
- Use 512x512 PNG with transparency

## Code Signing

### Windows
Set environment variables:
```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password
```

### macOS
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your@apple.id
export APPLE_ID_PASSWORD=app-specific-password
```

### Linux
No code signing required for Linux distributions.

## Troubleshooting

### "Python not found" error
Make sure Python 3.11+ is installed and in PATH:
```bash
python3 --version
```

### Build fails on macOS
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

### AppImage fails on Linux
Install required dependencies:
```bash
# Debian/Ubuntu
sudo apt-get install fakeroot dpkg rpm

# Fedora
sudo dnf install rpm-build dpkg
```

### Backend not starting
Check that backend dependencies are installed:
```bash
cd ../backend
pip install -r requirements.txt
```

## Distribution

### Windows
- Distribute `.exe` installer or portable version
- Users don't need Python installed (bundled)

### macOS
- Distribute `.dmg` file
- For M1/M2 Macs, use ARM64 build
- Application is not notarized (users need to allow in Security & Privacy)

### Linux
- **AppImage:** Universal, no installation needed
- **deb:** For Debian/Ubuntu users
- **rpm:** For RedHat/Fedora users
- Users need Python 3.11+ installed

## Auto-Update

To enable auto-updates, configure electron-builder's publish settings:

```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "telegram-saver-bot"
}
```

Then use:
```bash
npm run build -- --publish always
```

## Size Optimization

Current installer sizes (approximate):
- Windows: ~150 MB (NSIS), ~170 MB (portable)
- macOS: ~140 MB (DMG)
- Linux: ~130 MB (AppImage), ~50 MB (deb/rpm)

To reduce size:
1. Exclude unnecessary Python packages
2. Use `asar` packing (enabled by default)
3. Compress with UPX (not recommended for production)

## License

Ensure you comply with Electron's MIT license and include LICENSE file in distributions.
