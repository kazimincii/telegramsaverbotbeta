# Desktop App - Complete Build & Run Guide

Tam özellikli Telegram Saver Bot desktop uygulaması için kurulum, çalıştırma ve build kılavuzu.

## 🚀 Hızlı Başlangıç

### Gereksinimler

1. **Node.js** (v16 veya üzeri)
   - İndirin: https://nodejs.org/

2. **Python** (3.8 veya üzeri)
   - İndirin: https://www.python.org/downloads/
   - Windows için: "Add Python to PATH" seçeneğini işaretleyin

3. **Git** (opsiyonel)
   - İndirin: https://git-scm.com/

### Adım 1: Kurulum

```bash
# Repository'i klonlayın (veya ZIP olarak indirin)
git clone https://github.com/yourname/telegramsaverbotbeta.git
cd telegramsaverbotbeta

# Backend bağımlılıklarını yükleyin
cd backend
pip install -r requirements.txt
pip install -r requirements-optional.txt
cd ..

# Frontend bağımlılıklarını yükleyin
cd frontend
npm install
cd ..

# Desktop bağımlılıklarını yükleyin
cd desktop
npm install
cd ..
```

### Adım 2: Geliştirme Modunda Çalıştırma

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Desktop:**
```bash
cd desktop
npm start
```

✨ Uygulama otomatik olarak açılacak!

## 📦 Production Build (EXE Oluşturma)

### Hazırlık

1. **Frontend Build**
```bash
cd frontend
npm run build
cd ..
```

2. **Backend Hazırlığı**
```bash
# Backend zaten hazır, ekstra bir şey yapmaya gerek yok
```

### Windows için EXE Build

```bash
cd desktop
npm run build:win
```

**Çıktı:**
- `desktop/dist/Telegram Saver Setup-1.0.0.exe` - Installer
- `desktop/dist/Telegram Saver-1.0.0-win-portable.exe` - Portable

### macOS için DMG Build

```bash
cd desktop
npm run build:mac
```

**Çıktı:**
- `desktop/dist/Telegram Saver-1.0.0.dmg` - Disk Image
- `desktop/dist/Telegram Saver-1.0.0-mac.zip` - ZIP Archive

### Linux için AppImage/DEB/RPM Build

```bash
cd desktop
npm run build:linux
```

**Çıktı:**
- `desktop/dist/Telegram Saver-1.0.0.AppImage` - AppImage
- `desktop/dist/telegram-saver-desktop_1.0.0_amd64.deb` - Debian
- `desktop/dist/telegram-saver-desktop-1.0.0.x86_64.rpm` - RedHat
- `desktop/dist/Telegram Saver-1.0.0.tar.gz` - Tarball

### Tüm Platformlar için Build

```bash
cd desktop
npm run build:all
```

## 🏗️ Build Detayları

### Build Yapılandırması

Desktop uygulaması şunları içerir:

1. **Electron Ana Process** (`main.js`)
   - Python backend'i otomatik başlatır
   - Backend sağlık kontrolü yapar
   - Frontend'i yükler
   - System tray icon
   - IPC iletişimi

2. **Preload Script** (`preload.js`)
   - Güvenli Electron API erişimi
   - Context bridge

3. **Python Backend**
   - FastAPI server
   - Tüm backend özellikleri
   - Port 8000'de çalışır

4. **React Frontend**
   - Tam özellikli UI
   - Tüm component'ler
   - Production build

### Paket İçeriği

Build edilen EXE/DMG/AppImage şunları içerir:

```
TelegramSaver/
├── app/                      # Electron app
│   ├── main.js              # Ana process
│   ├── preload.js           # Preload script
│   └── resources/           # Icon'lar
├── backend/                 # Python backend
│   ├── main.py
│   ├── *.py                 # Tüm modüller
│   └── requirements.txt
└── frontend/                # React frontend (build)
    └── build/
        ├── index.html
        ├── static/
        └── ...
```

## 🎯 Özellikler

### Desktop App Özellikleri

✅ **Otomatik Backend Başlatma**
- Python backend otomatik başlar
- Sağlık kontrolü ile ready state tespiti
- Hata durumunda kullanıcıya bildirim

✅ **System Tray**
- Minimize ettiğinde tray'e gider
- Hızlı eylemler (Start/Stop download)
- Tray icon'dan açma/kapama

✅ **Native Features**
- Folder seçici dialog
- Folder'ı dosya gezgininde açma
- Backend'i yeniden başlatma
- Platform-specific davranışlar

✅ **Auto-Update** (Gelecek özellik)
- electron-updater ile otomatik güncelleme

✅ **Offline Support**
- Backend çevrimdışı çalışır
- Tüm veriler local'de

### Backend Özellikleri

🔥 **Core Features:**
- Telegram media download
- Multi-account support
- Scheduled downloads
- Duplicate detection

🤖 **AI Features:**
- CLIP image search
- AI classification
- Content moderation

☁️ **Cloud & Storage:**
- Google Drive sync
- Dropbox sync
- IPFS/Filecoin support

🔧 **Advanced:**
- Plugin system
- Webhook manager
- Video processing
- Multi-language (8 diller)

🏢 **Enterprise:**
- Multi-tenant
- RBAC (40+ permissions)
- Organization management

### Frontend UI Özellikleri

🎨 **Modern UI:**
- Dark/Light theme
- Responsive design
- Gradient buttons
- Smooth animations

📊 **Dashboards:**
- Control panel
- Analytics dashboard
- Statistics & charts

⚙️ **Management:**
- Webhook manager
- Cloud sync settings
- Video processor
- Enterprise manager
- Language selector

## 🐛 Troubleshooting

### Backend Başlamıyor

**Problem:** "Python Not Found" hatası

**Çözüm:**
1. Python'un yüklü olduğundan emin olun
2. PATH'e eklendiğini kontrol edin:
   ```bash
   python --version
   # veya
   python3 --version
   ```
3. Windows'ta Python Launcher kullanın:
   ```bash
   py --version
   ```

### Frontend Yüklenmiyor

**Problem:** "Failed to Load Application"

**Çözüm Development:**
```bash
cd frontend
npm start
# Backend de çalışıyor olmalı
```

**Çözüm Production:**
```bash
cd frontend
npm run build
# Sonra desktop build
```

### Port Zaten Kullanımda

**Problem:** "Port 8000 already in use"

**Çözüm:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Build Hatası

**Problem:** electron-builder hatası

**Çözüm:**
```bash
cd desktop
rm -rf node_modules
npm install
npm run build:win
```

### Python Bağımlılıkları Eksik

**Problem:** ModuleNotFoundError

**Çözüm:**
```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-optional.txt
pip install -r requirements-blockchain.txt  # IPFS için
```

## 📝 Geliştirme Notları

### Port Yapılandırması

- **Backend:** 8000 (config.json'da değiştirilebilir)
- **Frontend Dev:** 3000 (React default)
- **Frontend Prod:** Electron içinde file:// protocol

### Environment Variables

Backend `.env` dosyası oluşturun:

```env
# Telegram API
API_ID=your_api_id
API_HASH=your_api_hash

# Optional
IPFS_API_URL=http://localhost:5001
ENABLE_FILECOIN=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Development vs Production

**Development:**
- 3 ayrı terminal
- Hot reload (frontend)
- DevTools açık
- Hata mesajları detaylı

**Production:**
- Tek EXE dosyası
- Backend paketlenmiş
- Frontend build edilmiş
- Hata mesajları kullanıcı dostu

## 🔒 Güvenlik

### Electron Güvenlik

✅ `nodeIntegration: false` - Node.js devre dışı
✅ `contextIsolation: true` - Context izolasyonu
✅ `enableRemoteModule: false` - Remote module kapalı
✅ Preload script ile güvenli API
✅ CSP (Content Security Policy)

### Backend Güvenlik

✅ CORS yapılandırması
✅ API key authentication
✅ RBAC permissions
✅ Input validation
✅ SQL injection koruması

## 📄 Lisans

MIT License - See LICENSE file

## 🆘 Destek

- **Documentation:** README.md dosyalarını kontrol edin
- **Issues:** GitHub Issues'da rapor edin
- **Email:** support@telegramsaver.com (örnek)

## 🎉 Sonuç

Artık tam özellikli, cross-platform Telegram Saver Bot desktop uygulamanız hazır!

### Build Özeti:

1. ✅ Backend: Python FastAPI
2. ✅ Frontend: React + Modern UI
3. ✅ Desktop: Electron wrapper
4. ✅ Build: Windows/macOS/Linux EXE/DMG/AppImage
5. ✅ Features: 40+ özellik entegre

**Build Komutu:**
```bash
# Tüm platformlar için
cd desktop && npm run build:all

# Sadece Windows için
cd desktop && npm run build:win
```

**Sonuç:**
`desktop/dist/` klasöründe yüklenebilir installer'lar!

🚀 Happy Coding!
