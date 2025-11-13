# 📱 Telegram Saver Bot - Complete Edition

**Tam özellikli Telegram medya indirici ve yönetim sistemi**

> 🚀 Desktop App (Windows/macOS/Linux) | ☁️ Cloud Sync | 🤖 AI Features | 🏢 Enterprise Ready

## ✨ Özellikler

### 🎯 Core Features
- ✅ **Telegram Media Downloader** - Mesajlar, fotoğraflar, videolar, belgeler
- ✅ **Multi-Account Support** - Birden fazla Telegram hesabı
- ✅ **Scheduled Downloads** - Zamanlanmış otomatik indirme
- ✅ **Duplicate Detection** - Çift dosya tespiti
- ✅ **Contact Manager** - Kişi yönetimi ve VCF dışa aktarma

### 🤖 AI & Search Features
- ✅ **CLIP Image Search** - AI ile görsel arama
- ✅ **AI Classification** - Otomatik dosya sınıflandırma
- ✅ **Content Moderation** - Otomatik içerik filtreleme

### ☁️ Cloud & Sync
- ✅ **Google Drive Sync** - Otomatik Google Drive yedekleme
- ✅ **Dropbox Sync** - Dropbox entegrasyonu
- ✅ **IPFS/Filecoin** - Merkezi olmayan depolama
- ✅ **HTML Export** - Sohbet geçmişini HTML'e aktarma

### 🔧 Advanced Features
- ✅ **Plugin System** - Genişletilebilir mimari (40+ hook)
- ✅ **Webhook Manager** - Zapier/Make.com entegrasyonu
- ✅ **Video Processing** - Thumbnail, compress, transcribe
- ✅ **Real-time WebSocket** - Canlı ilerleme bildirimleri

### 🏢 Enterprise Features
- ✅ **Multi-Tenant** - Organizasyon bazlı izolasyon
- ✅ **RBAC** - 40+ granüler izin sistemi
- ✅ **API Authentication** - API key tabanlı güvenlik
- ✅ **Organization Management** - 3 plan: Free/Pro/Enterprise

### 🌐 Multi-Language Support
- ✅ **8 Dil** - English, Türkçe, Español, Français, Deutsch, Русский, 中文, 日本語
- ✅ **Dynamic Switching** - Sayfa yenilemeden dil değiştirme
- ✅ **Extensible** - Kolay yeni dil ekleme

## 🚀 Hızlı Başlangıç

### Desktop App (Önerilen)

**Windows:**
```bash
# Çift tıkla!
start-desktop.bat
```

**macOS/Linux:**
```bash
./start-desktop.sh
```

Uygulama otomatik olarak backend ve frontend'i başlatacak ve açılacak!

### Manuel Başlatma

**1. Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**2. Frontend:**
```bash
cd frontend
npm install
npm start
```

**3. Desktop (Opsiyonel):**
```bash
cd desktop
npm install
npm start
```

## 📦 Build (EXE Oluşturma)

### Otomatik Build

**Windows:**
```bash
build-desktop.bat
```

**macOS/Linux:**
```bash
./build-desktop.sh
```

### Manuel Build

```bash
# 1. Frontend build
cd frontend
npm run build

# 2. Desktop build
cd ../desktop

# Windows EXE
npm run build:win

# macOS DMG
npm run build:mac

# Linux AppImage/DEB
npm run build:linux

# Tüm platformlar
npm run build:all
```

**Çıktı:** `desktop/dist/` klasöründe yüklenebilir dosyalar!

## 📋 Gereksinimler

### Sistem Gereksinimleri
- **Node.js** 16+ (https://nodejs.org/)
- **Python** 3.8+ (https://www.python.org/)
- **Git** (Opsiyonel)

### Python Paketleri
```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-optional.txt  # AI features
pip install -r requirements-blockchain.txt  # IPFS support
```

### Node.js Paketleri
```bash
# Frontend
cd frontend && npm install

# Desktop
cd desktop && npm install
```

## ⚙️ Konfigürasyon

### Backend Config

`backend/config.json` oluşturun:

```json
{
  "api_id": "YOUR_API_ID",
  "api_hash": "YOUR_API_HASH",
  "phone": "+90XXXXXXXXXX",
  "download_path": "downloads/",
  "session_name": "telegram_session"
}
```

**Telegram API bilgilerinizi alın:** https://my.telegram.org/apps

### Environment Variables

`backend/.env` oluşturun:

```env
# Telegram API
API_ID=your_api_id
API_HASH=your_api_hash

# Optional Features
IPFS_API_URL=http://localhost:5001
ENABLE_FILECOIN=false
LOG_LEVEL=INFO

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

## 🎯 Kullanım

### Web Panel

http://localhost:3000 adresine gidin

**İlk Kurulum:**
1. API ID ve API Hash girin
2. "Kaydet" butonuna tıklayın
3. "Başlat" ile bağlantıyı başlatın
4. Telefon doğrulaması yapın

### Desktop App

Desktop uygulaması otomatik olarak:
- Python backend'i başlatır
- React frontend'i yükler
- System tray'e minimize olur
- Tüm özelliklere erişim sağlar

**System Tray Menü:**
- Show App - Uygulamayı göster
- Start/Stop Download - İndirmeyi başlat/durdur
- Analytics - İstatistikleri göster
- Settings - Ayarlar
- Quit - Çıkış

## 📊 Modüller

### Backend Modülleri

```
backend/
├── main.py                    # FastAPI server
├── contacts.py                # Kişi yönetimi
├── database.py                # SQLite database
├── account_manager.py         # Multi-account
├── cloud_sync.py              # Cloud senkronizasyon
├── ai_classifier.py           # AI sınıflandırma
├── scheduler.py               # Zamanlanmış görevler
├── clip_classifier.py         # CLIP görsel arama
├── duplicate_detector.py      # Çift tespiti
├── webhook_manager.py         # Webhook sistemi
├── video_processor.py         # Video işleme
├── ipfs_storage.py            # IPFS/Filecoin
├── plugin_system.py           # Plugin mimarisi
├── i18n_manager.py            # Çoklu dil
├── rbac_system.py             # RBAC + Multi-tenant
└── content_moderator.py       # AI moderasyon
```

### Frontend Components

```
frontend/src/components/
├── ControlPanel.js            # Ana kontrol paneli
├── ThemeToggle.js             # Dark/Light tema
├── CLIPSearchPanel.js         # AI görsel arama
├── WebhookManager.js          # Webhook yönetimi
├── CloudSyncSettings.js       # Cloud ayarları
├── VideoProcessor.js          # Video işleme UI
├── AnalyticsDashboard.js      # İstatistikler
├── LanguageSelector.js        # Dil seçici
└── EnterpriseManager.js       # Enterprise yönetim
```

### Desktop App

```
desktop/
├── main.js                    # Electron main process
├── preload.js                 # Preload script
├── package.json               # Build configuration
└── resources/                 # Icons & assets
```

## 🔌 API Endpoints

### Status & Info
- `GET /api/status` - Sistem durumu
- `GET /api/contacts` - Kişiler listesi
- `GET /api/stats` - İstatistikler
- `GET /api/database/stats` - Veritabanı istatistikleri

### Accounts
- `GET /api/accounts` - Hesaplar
- `POST /api/accounts` - Hesap ekle
- `DELETE /api/accounts/{id}` - Hesap sil
- `POST /api/accounts/{id}/switch` - Hesap değiştir

### Download Operations
- `POST /api/start` - İndirmeyi başlat
- `POST /api/stop` - İndirmeyi durdur
- `POST /api/export-contacts` - VCF dışa aktar

### Cloud Sync
- `GET /api/cloud/config` - Cloud ayarları
- `POST /api/cloud/config` - Cloud yapılandır
- `POST /api/cloud/sync` - Manuel senkronizasyon

### AI & Search
- `POST /api/clip/search` - CLIP görsel arama
- `POST /api/ai/classify` - AI sınıflandırma
- `GET /api/duplicates` - Çift dosyalar

### Webhooks
- `GET /api/webhooks` - Webhook listesi
- `POST /api/webhooks` - Webhook oluştur
- `DELETE /api/webhooks/{id}` - Webhook sil
- `POST /api/webhooks/test` - Webhook test

### Video Processing
- `POST /api/video/thumbnail` - Thumbnail oluştur
- `POST /api/video/compress` - Video sıkıştır
- `POST /api/video/transcribe` - Ses transkript

### IPFS/Blockchain
- `POST /api/ipfs/upload` - IPFS'e yükle
- `POST /api/ipfs/download` - IPFS'den indir
- `POST /api/ipfs/pin` - Dosya sabitle
- `GET /api/ipfs/pins` - Pinned dosyalar

### Plugins
- `GET /api/plugins` - Plugin listesi
- `POST /api/plugins/load` - Plugin yükle
- `POST /api/plugins/unload` - Plugin kaldır
- `GET /api/plugins/discover` - Mevcut pluginler

### i18n (Internationalization)
- `GET /api/i18n/languages` - Desteklenen diller
- `GET /api/i18n/translations/{lang}` - Çeviriler
- `POST /api/i18n/add-translation` - Çeviri ekle

### RBAC & Enterprise
- `GET /api/rbac/organizations` - Organizasyonlar
- `POST /api/rbac/organizations` - Organizasyon oluştur
- `GET /api/rbac/users` - Kullanıcılar
- `POST /api/rbac/users` - Kullanıcı oluştur
- `GET /api/rbac/roles` - Roller
- `POST /api/rbac/roles` - Rol oluştur
- `GET /api/rbac/permissions` - İzinler
- `POST /api/rbac/check-permission` - İzin kontrolü
- `POST /api/rbac/authenticate` - API key doğrulama

### Content Moderation
- `POST /api/moderation/moderate` - Dosya modere et
- `GET /api/moderation/rules` - Moderasyon kuralları
- `POST /api/moderation/rules` - Kural oluştur
- `GET /api/moderation/statistics` - İstatistikler

**Toplam:** 60+ API endpoint!

## 📚 Dokümantasyon

- **[DESKTOP_APP_GUIDE.md](DESKTOP_APP_GUIDE.md)** - Desktop app rehberi
- **[PLUGIN_DEVELOPMENT.md](PLUGIN_DEVELOPMENT.md)** - Plugin geliştirme
- **[I18N_GUIDE.md](I18N_GUIDE.md)** - Çoklu dil rehberi
- **[ENTERPRISE_GUIDE.md](ENTERPRISE_GUIDE.md)** - Enterprise özellikleri
- **[desktop/BUILD.md](desktop/BUILD.md)** - Build detayları

## 🔧 Geliştirme

### Code Maintenance

```bash
# Kod kontrolü
python maintainer.py check

# Otomatik düzeltme
python maintainer.py fix
```

### Hot Reload

Development modda tüm değişiklikler otomatik yüklenir:
- Backend: FastAPI auto-reload
- Frontend: React hot reload
- Desktop: Electron'da `npm start`

### Debugging

**Backend logs:**
```bash
tail -f log/telegramsaver.log
```

**Frontend DevTools:**
Desktop app'te otomatik açılır (development mode)

## 🐛 Troubleshooting

### Python Bulunamadı

```bash
# Windows'ta PATH'e eklendi mi kontrol edin
python --version

# veya
py --version
```

### Port Zaten Kullanımda

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Build Hatası

```bash
# Node modules'ları temizle
cd desktop
rm -rf node_modules
npm install
npm run build:win
```

Daha fazla sorun çözümü için [DESKTOP_APP_GUIDE.md](DESKTOP_APP_GUIDE.md) dosyasına bakın.

## 🎨 Screenshots

### Main Dashboard
![Dashboard](screenshots/dashboard.png)

### AI Image Search
![CLIP Search](screenshots/clip-search.png)

### Enterprise Management
![Enterprise](screenshots/enterprise.png)

### Video Processing
![Video Processor](screenshots/video-processor.png)

## 🏗️ Proje Yapısı

```
telegramsaverbotbeta/
│
├── backend/                      # Python FastAPI backend
│   ├── main.py                  # Ana server
│   ├── *.py                     # 15+ modül
│   ├── requirements*.txt        # Bağımlılıklar
│   └── config.json              # Konfigürasyon
│
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/          # 10+ component
│   │   ├── context/             # React context
│   │   └── App.js               # Ana component
│   ├── public/
│   └── package.json
│
├── desktop/                      # Electron desktop app
│   ├── main.js                  # Main process
│   ├── preload.js               # Preload script
│   ├── package.json             # Build config
│   └── resources/               # Assets
│
├── plugins/                      # Plugin dizini
│   └── sample_plugin.py         # Örnek plugin
│
├── translations/                 # Çeviri dosyaları
│   ├── en.json                  # English
│   ├── tr.json                  # Türkçe
│   └── ...                      # 6 dil daha
│
├── log/                          # Log dosyaları
├── downloads/                    # İndirilen dosyalar
│
├── start-desktop.bat/sh          # Başlatma scriptleri
├── build-desktop.bat/sh          # Build scriptleri
├── run-all.bat                   # Hızlı başlatma
│
└── *.md                          # Dokümantasyon
```

## 📈 İstatistikler

### Kod İstatistikleri
- **Backend:** 15+ Python modülleri (~8,000 satır)
- **Frontend:** 10+ React componentleri (~4,000 satır)
- **Desktop:** Electron wrapper (~600 satır)
- **API Endpoints:** 60+
- **Features:** 40+
- **Languages:** 8 dil desteği
- **Permissions:** 40+ RBAC izinleri

### Teknoloji Stack

**Backend:**
- Python 3.8+
- FastAPI
- Telethon
- SQLite
- CLIP (AI)
- OpenCV
- Transformers

**Frontend:**
- React 18
- Modern ES6+
- Context API
- Fetch API
- Responsive CSS

**Desktop:**
- Electron 28
- Node.js 16+
- electron-builder
- Cross-platform

**Cloud & Storage:**
- Google Drive API
- Dropbox API
- IPFS/Filecoin
- S3-compatible

## 🤝 Contributing

Katkıda bulunmak için:

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- [Telethon](https://github.com/LonamiWebs/Telethon) - Telegram client library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [Electron](https://www.electronjs.org/) - Desktop framework
- [CLIP](https://github.com/openai/CLIP) - AI image understanding

## 📞 İletişim

- **GitHub:** [telegramsaverbotbeta](https://github.com/yourname/telegramsaverbotbeta)
- **Email:** support@telegramsaver.com (örnek)
- **Discord:** [Join our community](https://discord.gg/example)

## 🎯 Roadmap

### Yakında Gelecek Özellikler

- [ ] Auto-update (electron-updater)
- [ ] Real-time video moderation
- [ ] Custom ML model training
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] Docker support
- [ ] Kubernetes deployment

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**

🚀 **Made with ❤️ by Telegram Saver Team**
