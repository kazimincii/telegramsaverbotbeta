# Telegram Saver Bot - GUI Test Rehberi

**Platform:** Windows / macOS / Linux Desktop  
**Test Tipi:** Manuel GUI Test  
**Gereksinimler:** Desktop ortamı (GUI mevcut)

---

## 🎯 Test Edilecek Özellikler

Bu rehber, Telegram Saver Bot desktop uygulamasının GUI ortamında test edilmesi için hazırlanmıştır.

---

## 📋 ÖN GEREKSİNİMLER

### 1. Sistem Gereksinimleri
- **Windows:** Windows 10/11 (64-bit)
- **macOS:** macOS 10.13+ (High Sierra)
- **Linux:** Ubuntu 20.04+ veya eşdeğer (X11 veya Wayland)

### 2. Yazılım Gereksinimleri
```bash
# Node.js 18.x
node --version  # v18.x.x

# Python 3.8+
python --version  # Python 3.8+

# npm
npm --version  # 9.x+
```

### 3. Telegram API Bilgileri
- API_ID: https://my.telegram.org/apps
- API_HASH: https://my.telegram.org/apps

---

## 🚀 BAŞLATMA ADIMLARI

### Adım 1: Repository'yi Clone Et
```bash
git clone https://github.com/kazimincii/telegramsaverbotbeta.git
cd telegramsaverbotbeta
git checkout claude/check-repo-update-011CV5gKU2w8sDvHPEBENrEE
```

### Adım 2: Backend Yapılandırması
```bash
cd backend
pip install -r requirements.txt

# .env dosyasını düzenle
cp .env.example .env
nano .env  # veya notepad .env (Windows)

# API bilgilerini ekle:
API_ID=12345678
API_HASH=your_api_hash_here
JWT_SECRET_KEY=$(openssl rand -hex 32)  # Linux/macOS
# Windows için: https://www.random.org/strings/ kullan (32 karakter hex)
```

### Adım 3: Frontend Build
```bash
cd ../frontend
npm install
npm run build
```

### Adım 4: Desktop Dependencies
```bash
cd ../desktop
npm install
```

---

## 🧪 TEST 1: ELECTRON WINDOW AÇILIŞI

### Başlatma
```bash
cd desktop
npm start
```

### Kontrol Listesi
- [ ] Electron window açılıyor mu? (1400x900 boyutunda)
- [ ] Window title "Telegram Saver Bot" olarak görünüyor mu?
- [ ] Window minimize/maximize/close butonları çalışıyor mu?
- [ ] Window resize edilebiliyor mu? (min: 1000x700)
- [ ] DevTools açılıyor mu? (Development modda otomatik)

### Beklenen Sonuç
✅ Electron penceresi açılır, dark tema ile  
✅ Loading ekranı görünür veya doğrudan frontend yüklenir

### Hata Durumunda
❌ **Pencere açılmıyorsa:**
```bash
# Terminal çıktısını kontrol et
# Electron log dosyasını kontrol et:
# Windows: %APPDATA%/telegram-saver-desktop/logs/main.log
# macOS: ~/Library/Logs/telegram-saver-desktop/main.log
# Linux: ~/.config/telegram-saver-desktop/logs/main.log
```

---

## 🧪 TEST 2: TRAY ICON GÖRÜNÜMÜ

### Kontrol Listesi
- [ ] System tray'de icon görünüyor mu?
- [ ] Icon'a tıklandığında window show/hide oluyor mu?
- [ ] Sağ tık → Context menu açılıyor mu?
- [ ] Context menu öğeleri:
  - [ ] "Show App"
  - [ ] "Start Download"
  - [ ] "Stop Download"
  - [ ] "Analytics"
  - [ ] "Settings"
  - [ ] "Quit"

### Test Adımları
1. Uygulamayı başlat
2. System tray'i kontrol et (Windows: sağ alt, macOS: sağ üst, Linux: panel)
3. Icon'a sol tık → Window toggle
4. Icon'a sağ tık → Context menu
5. Her menu öğesine tıkla

### Beklenen Sonuç
✅ Tray icon mavi Telegram logosu görünür  
✅ Tooltip "Telegram Saver Bot" yazar  
✅ Tüm menu öğeleri çalışır

### Hata Durumunda
❌ **Icon görünmüyorsa:**
- Icon dosyalarını kontrol et: `desktop/resources/icon.png`
- Log'ları kontrol et: "Tray icon not found" uyarısı var mı?

---

## 🧪 TEST 3: BACKEND OTOMATİK BAŞLATMA

### Kontrol Listesi
- [ ] Uygulama başladığında backend otomatik başlıyor mu?
- [ ] Backend hazır olana kadar loading gösteriliyor mu?
- [ ] Backend 5 saniye içinde hazır oluyor mu?
- [ ] Backend crash olduğunda hata mesajı gösteriliyor mu?

### Test Adımları
1. Uygulamayı başlat
2. Terminal/console çıktısını izle
3. "Uvicorn running on http://0.0.0.0:8000" mesajını bekle
4. Browser'da http://localhost:8000/docs aç (Swagger UI)

### Beklenen Sonuç
✅ Backend otomatik başlar  
✅ 3-5 saniye içinde hazır olur  
✅ Swagger UI http://localhost:8000/docs adresinde erişilebilir

### Backend Çıktı Örneği
```
[Backend] Starting Python backend...
[Backend] INFO:     Started server process [12345]
[Backend] INFO:     Application startup complete.
[Backend] INFO:     Uvicorn running on http://0.0.0.0:8000
Backend started successfully!
```

### Hata Durumunda
❌ **Backend başlamıyorsa:**
```bash
# Python yüklü mü?
python --version

# Dependencies yüklü mü?
cd backend
pip install -r requirements.txt

# Backend'i manuel test et
python main.py
# veya
uvicorn main:APP --host 0.0.0.0 --port 8000
```

---

## 🧪 TEST 4: FRONTEND YÜKLENMESİ

### Kontrol Listesi
- [ ] Frontend UI yükleniyor mu?
- [ ] Dark tema aktif mi?
- [ ] Tüm paneller görünüyor mu?
  - [ ] Status Panel
  - [ ] Control Panel
  - [ ] Settings
  - [ ] Contacts/Groups
- [ ] Network istekleri başarılı mı? (DevTools → Network)

### Test Adımları
1. Uygulamayı başlat
2. Frontend yüklenene kadar bekle
3. F12 → DevTools aç
4. Console'da hata var mı kontrol et
5. Network tab'inde API isteklerini kontrol et

### Beklenen API İstekleri
```
GET http://localhost:8000/api/status → 200 OK
GET http://localhost:8000/api/accounts → 200 OK
GET http://localhost:8000/api/i18n/languages → 200 OK
```

### Beklenen Sonuç
✅ Frontend 2-3 saniye içinde yüklenir  
✅ UI responsive ve interaktif  
✅ Console'da kritik hata yok

### Hata Durumunda
❌ **Frontend yüklenmiyorsa:**
- DevTools Console'u kontrol et
- Network tab'inde failed requests var mı?
- `frontend/build/` klasörü var mı?
- CORS hatası varsa backend CORS config'i kontrol et

---

## 🧪 TEST 5: TELEGRAM BAĞLANTISI

### Kontrol Listesi
- [ ] "Add Account" butonu çalışıyor mu?
- [ ] Phone number girişi yapılabiliyor mu?
- [ ] QR Code login çalışıyor mu?
- [ ] Verification code girişi yapılabiliyor mu?
- [ ] Login başarılı oluyor mu?
- [ ] Account listede görünüyor mu?

### Test Adımları
1. Frontend'de "Add Account" tıkla
2. Phone number gir (+90XXXXXXXXXX)
3. Telegram'dan gelen kodu gir
4. 2FA varsa şifreyi gir
5. Session başarıyla oluşturuldu mu kontrol et

### Beklenen Sonuç
✅ Telegram login akışı sorunsuz çalışır  
✅ Session `backend/*.session` dosyasına kaydedilir  
✅ Account listede aktif olarak görünür

### Hata Durumında
❌ **Login başarısız oluyorsa:**
- API_ID ve API_HASH doğru mu? (backend/.env)
- Phone number formatı doğru mu? (+90XXXXXXXXXX)
- Telegram hesabı aktif mi?
- Log'larda hata mesajı var mı?

---

## 🧪 TEST 6: DOWNLOAD FONKSİYONU

### Kontrol Listesi
- [ ] Chat/Group seçimi yapılabiliyor mu?
- [ ] Filter ayarları çalışıyor mu?
- [ ] "Start Download" butonu çalışıyor mu?
- [ ] Download progress gösteriliyor mu?
- [ ] Dosyalar kaydediliyor mu?
- [ ] Download tamamlanınca notification gösteriliyor mu?

### Test Adımları
1. Bir chat/group seç
2. Filter ayarları yap (opsiyonel)
3. "Start Download" tıkla
4. Status panel'de progress'i izle
5. `backend/downloads/` klasörünü kontrol et

### Beklenen Sonuç
✅ Download başlar  
✅ Progress real-time güncellenir  
✅ Dosyalar `downloads/` klasörüne kaydedilir  
✅ Tamamlandığında notification gösterilir

---

## 🧪 TEST 7: SYSTEM TRAY ACTIONS

### Kontrol Listesi
- [ ] Tray → "Start Download" çalışıyor mu?
- [ ] Tray → "Stop Download" çalışıyor mu?
- [ ] Tray → "Settings" settings sayfasını açıyor mu?
- [ ] Tray → "Analytics" analytics sayfasını açıyor mu?
- [ ] Tray → "Quit" uygulamayı kapatıyor mu?

### Test Adımları
1. Her tray action'ı test et
2. Window minimize edildiğinde tray'de kalıyor mu?
3. Quit ile kapatıldığında backend de kapanıyor mu?

---

## 🧪 TEST 8: AUTO-UPDATER

### Kontrol Listesi
- [ ] Uygulama başladığında update kontrolü yapılıyor mu? (production)
- [ ] Update varsa dialog gösteriliyor mu?
- [ ] Download progress gösteriliyor mu?
- [ ] Update install ediliyor mu?

### Test (Production Build Gerekli)
```bash
# Production build yap
npm run build:win  # Windows
npm run build:mac  # macOS
npm run build:linux  # Linux

# Build'i çalıştır
./dist/Telegram-Saver-1.0.0-win-x64.exe
```

**Not:** Auto-updater sadece production build'de çalışır (development'da disabled)

---

## 🧪 TEST 9: CRASH REPORTER

### Kontrol Listesi
- [ ] Crash olduğunda crash report oluşturuluyor mu?
- [ ] Crash reports `logs/crash-logs/` klasöründe mi?
- [ ] Crash report JSON formatında mı?
- [ ] Sistem bilgileri dahil mi?

### Test (Development Mode)
```bash
# DevTools Console'da hata fırlat
throw new Error('Test crash');

# Crash log dosyasını kontrol et
# Windows: %APPDATA%/telegram-saver-desktop/crash-logs/
# macOS: ~/Library/Application Support/telegram-saver-desktop/crash-logs/
# Linux: ~/.config/telegram-saver-desktop/crash-logs/
```

---

## 🧪 TEST 10: PERFORMANCE

### Kontrol Listesi
- [ ] Memory usage makul mu? (<500MB idle)
- [ ] CPU usage düşük mü? (<5% idle)
- [ ] Window smooth resize yapılıyor mu?
- [ ] UI lag yok mu?
- [ ] Backend response time hızlı mı? (<100ms)

### Test Araçları
- **Task Manager** (Windows)
- **Activity Monitor** (macOS)
- **System Monitor** (Linux)
- **DevTools → Performance**

---

## 📊 TEST SONUÇ RAPORU ŞABLONUişte tüm testlerin sonuçlarını bu şablona göre kaydedin:

```markdown
# GUI Test Sonuçları

**Tarih:** YYYY-MM-DD
**Platform:** Windows 10 / macOS 14 / Ubuntu 22.04
**Test Eden:** İsim

## Test Sonuçları

| Test # | Test Adı | Durum | Notlar |
|--------|----------|-------|--------|
| 1 | Electron Window | ✅/❌ | |
| 2 | Tray Icon | ✅/❌ | |
| 3 | Backend Startup | ✅/❌ | |
| 4 | Frontend Loading | ✅/❌ | |
| 5 | Telegram Connection | ✅/❌ | |
| 6 | Download Function | ✅/❌ | |
| 7 | Tray Actions | ✅/❌ | |
| 8 | Auto-Updater | ✅/❌ | |
| 9 | Crash Reporter | ✅/❌ | |
| 10 | Performance | ✅/❌ | |

## Bulunan Hatalar

### Hata 1
**Açıklama:**  
**Reproducing:**  
**Beklenen:**  
**Gerçekleşen:**  

## Ekran Görüntüleri

[Ekran görüntülerini buraya ekle]

## Öneriler

[İyileştirme önerileri]
```

---

## 🐛 SORUN GİDERME

### Hata: "Python Not Found"
```bash
# Python yüklü mü kontrol et
python --version
python3 --version

# PATH'e eklenmiş mi?
where python  # Windows
which python3  # Linux/macOS
```

### Hata: "Backend Not Responding"
```bash
# Backend manuel başlat ve test et
cd backend
python main.py

# Port 8000 kullanılıyor mu?
netstat -ano | findstr :8000  # Windows
lsof -i :8000  # Linux/macOS
```

### Hata: "Frontend Build Missing"
```bash
# Frontend'i rebuild et
cd frontend
npm install
npm run build

# Build klasörü var mı?
ls -la build/  # Linux/macOS
dir build\  # Windows
```

### Hata: "Tray Icon Missing"
```bash
# Icon dosyaları var mı?
ls -la desktop/resources/*.png
ls -la desktop/resources/*.ico
ls -la desktop/resources/*.icns

# Icon'ları yeniden generate et
cd desktop/resources
bash generate-icons.sh  # Linux/macOS
generate-icons.bat  # Windows
```

### Hata: "Module Not Found"
```bash
# Node modules yeniden yükle
cd desktop
rm -rf node_modules
npm install

# Python dependencies yeniden yükle
cd backend
pip install -r requirements.txt --force-reinstall
```

---

## 📝 LOG DOSYALARI

### Log Lokasyonları

**Windows:**
```
%APPDATA%\telegram-saver-desktop\logs\main.log
%APPDATA%\telegram-saver-desktop\crash-logs\*.json
```

**macOS:**
```
~/Library/Logs/telegram-saver-desktop/main.log
~/Library/Application Support/telegram-saver-desktop/crash-logs/*.json
```

**Linux:**
```
~/.config/telegram-saver-desktop/logs/main.log
~/.config/telegram-saver-desktop/crash-logs/*.json
```

### Log İnceleme
```bash
# Main log
tail -f main.log

# Son 100 satır
tail -100 main.log

# Hata satırları
grep -i error main.log
grep -i crash main.log
```

---

## ✅ BAŞARILI TEST ÇIKTISI ÖRNEĞİ

```
==========================================
  Telegram Saver Bot - Test Başarılı!
==========================================

✅ Electron window açıldı
✅ Tray icon görünüyor
✅ Backend otomatik başladı (3.2s)
✅ Frontend yüklendi (1.8s)
✅ Telegram bağlantısı başarılı
✅ Download fonksiyonu çalışıyor
✅ Tray actions çalışıyor
✅ Auto-updater yapılandırılmış
✅ Crash reporter aktif
✅ Performance: Memory 245MB, CPU 2.1%

TOPLAM: 10/10 TEST BAŞARILI ✅
```

---

## 🚀 SONRAKI ADIMLAR

Test başarılı olduysa:
1. ✅ Production build al
2. ✅ Installer test et
3. ✅ End-to-end senaryo test et
4. ✅ Farklı platformlarda test et
5. ✅ Beta kullanıcılara dağıt

---

**Hazırlayan:** Claude Code Agent  
**Versiyon:** 1.0  
**Tarih:** 2025-11-13
