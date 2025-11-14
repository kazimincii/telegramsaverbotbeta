# Telegram AI Client - Kullanım Kılavuzu

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Kurulum](#kurulum)
3. [İlk Kullanım - Telegram ile Giriş](#ilk-kullanım)
4. [Ana Arayüz](#ana-arayüz)
5. [Özellikler](#özellikler)
6. [API Dokümantasyonu](#api-dokümantasyonu)
7. [Sorun Giderme](#sorun-giderme)

---

## Genel Bakış

Telegram AI Client, Telegram hesabınızla giriş yaparak mesajlarınızı, kişilerinizi ve gruplarınızı yönetmenizi sağlayan ve yapay zeka destekli kişi profilleme özelliği sunan bir masaüstü uygulamasıdır.

### Temel Özellikler

- **Telegram ile Giriş**: Resmi Telegram API kullanarak güvenli giriş
- **Encrypted Session Management**: Şifreli oturum yönetimi
- **Telegram Benzeri Arayüz**: Tanıdık ve kullanımı kolay arayüz
- **AI Kişi Profilleme**: Kişilerin meslek ve sektörlerini otomatik tespit
- **Mesaj Görüntüleme**: Tüm chat ve mesajları görüntüleme
- **Real-time Sync**: Telegram verilerini gerçek zamanlı senkronizasyon

---

## Kurulum

### Gereksinimler

- **Node.js**: 16.x veya üzeri
- **Python**: 3.8 veya üzeri
- **Telegram API Bilgileri**: API ID ve API Hash

### Telegram API Bilgilerini Alma

1. [https://my.telegram.org/apps](https://my.telegram.org/apps) adresine gidin
2. Telegram hesabınızla giriş yapın
3. "Create New Application" butonuna tıklayın
4. Uygulama adı ve kısa açıklama girin
5. **API ID** ve **API Hash** bilgilerinizi kopyalayın

### Backend Kurulumu

```bash
cd backend

# .env.telegram dosyasını düzenleyin
nano .env.telegram

# API bilgilerinizi ekleyin:
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here

# .env dosyasına yükleyin (Linux/Mac)
cat .env.telegram >> .env

# Python paketlerini yükleyin
pip install -r requirements.txt

# Backend'i başlatın
python main.py
```

### Frontend Kurulumu

```bash
cd frontend

# Node paketlerini yükleyin
npm install

# Development modda başlatın
npm start

# Production build
npm run build
```

### Desktop App (Electron)

```bash
cd desktop

# Paketleri yükleyin
npm install

# Development modda başlatın
npm start

# Windows .exe build
npm run build:win

# macOS .dmg build
npm run build:mac

# Linux AppImage build
npm run build:linux
```

---

## İlk Kullanım

### 1. Splash Ekranı

Uygulama açıldığında, mevcut bir oturum olup olmadığını kontrol eden bir splash ekranı görürsünüz.

### 2. Telefon Numarası Girişi

İlk girişte:

1. **Ülke Kodunu** seçin (örn. Turkey +90)
2. **Telefon numaranızı** girin (555 123 45 67)
3. **Continue** butonuna tıklayın

Telegram'a kod gönderilecektir.

### 3. Doğrulama Kodu

1. Telegram'dan SMS veya uygulama içi kod alacaksınız
2. **5 haneli kodu** girin
3. Otomatik olarak ilerleyecektir

### 4. İki Faktörlü Kimlik Doğrulama (2FA)

Hesabınızda 2FA aktifse:

1. **Cloud password**'ünüzü girin
2. **Continue** butonuna tıklayın

### 5. Başarılı Giriş

Giriş başarılı olduğunda, ana Telegram Client arayüzüne yönlendirilirsiniz.

---

## Ana Arayüz

Arayüz 3 ana panelden oluşur:

```
┌─────────────┬──────────────────┬─────────────────┐
│             │                  │                 │
│  Sol Sidebar│   Orta Panel     │   Sağ Panel     │
│             │                  │                 │
│  - Chats    │  - Mesajlar      │  - AI Profili   │
│  - Contacts │  - Medya         │  - İstatistikler│
│  - AI       │  - Arama         │  - Anahtar      │
│  - Settings │                  │    Kelimeler    │
│             │                  │                 │
└─────────────┴──────────────────┴─────────────────┘
```

### Sol Sidebar

#### Tabs (Sekmeler)

- **Chats**: Tüm gruplar ve özel sohbetler
- **Contacts**: Kişiler listesi (AI profilleriyle)
- **AI Insights**: İstatistikler ve özetler
- **Settings**: Uygulama ayarları

#### Arama

Sidebar'ın üst kısmında bir arama kutusu bulunur. Buradan:
- Chat adlarında arama yapabilirsiniz
- Kişi isimlerinde arama yapabilirsiniz
- AI meslek etiketlerinde arama yapabilirsiniz

### Orta Panel - Mesajlar

Bir chat seçtiğinizde:

- **Chat Header**: Kullanıcı/grup bilgisi
- **Mesaj Listesi**: Tarih bölümlü mesajlar
- **Mesaj Input**: (Sadece görüntüleme modunda - şimdilik)

#### Mesaj Özellikleri

- Gönderen bilgisi (grup mesajlarında)
- Tarih ve saat damgası
- Medya göstergeleri (fotoğraf, video, belge)
- Okundu/gönderildi durumu

### Sağ Panel - AI Profili

Bir kişi seçtiğinizde (grup değil):

#### Profil Bilgileri

- **İsim** ve **Kullanıcı adı**
- **AI Tahmin Edilen Meslek**
- **Sektör**
- **Güven Seviyesi** (Confidence)

#### AI Analizi

- **Evidence Keywords**: AI'nın kullandığı anahtar kelimeler
- **Message Count**: Toplam mesaj sayısı
- **Last Activity**: Son aktivite tarihi
- **Engagement Score**: Etkileşim puanı
- **AI Summary**: AI tarafından oluşturulan özet

#### Manuel Düzenleme

AI tahminlerini manuel olarak düzenleyebilirsiniz:

1. **Edit** butonuna tıklayın
2. Meslek ve sektör alanlarını düzenleyin
3. **✓** (save) butonuna tıklayın

---

## Özellikler

### 1. Session Yönetimi

#### Otomatik Session Kaydı

Giriş yaptıktan sonra, session bilgileriniz şifrelenmiş olarak kaydedilir:

- **Lokasyon**: `backend/.telegram_sessions/telegram.session`
- **Şifreleme**: Fernet (AES) şifreleme
- **Anahtar**: `backend/.telegram_sessions/.session_key`

#### Güvenlik

- Session dosyaları `0600` izinleriyle saklanır (sadece siz okuyabilirsiniz)
- Şifreleme anahtarı otomatik oluşturulur
- Her çıkış yaptığınızda, oturum geçerliliği korunur

### 2. Chats ve Mesajlar

#### Chat Listesi

- Son 100 chat gösterilir
- Son mesaj önizlemesi
- Okunmamış mesaj sayısı
- Son mesaj tarihi

#### Mesaj Görüntüleme

- Chat başına 100 mesaj (varsayılan)
- Tarih gruplandırması
- Sender bilgisi (gruplarda)
- Medya tipleri (photo, video, document)

### 3. Contacts ve AI Profilleme

#### AI Tahmin Sistemi

*Not: AI profilleme henüz backend'de implement edilmemiş. Placeholder data gösterilir.*

Gelecek güncellemede:
- Mesajlardan meslek tahmini
- Sektör analizi
- Anahtar kelime çıkarımı
- Güven skorlaması

#### Manuel Override

AI tahminlerini manuel olarak düzenleyebilir ve kaydedebilirsiniz.

### 4. Real-time Sync

Uygulama açıldığında:
- Mevcut chats çekilir
- Contacts senkronize edilir
- AI profilleme tetiklenir (gelecek versiyonlarda)

---

## API Dokümantasyonu

### Backend Endpoints

#### Authentication

**GET** `/api/telegram/status`
```json
{
  "ok": true,
  "logged_in": true,
  "user": {
    "id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "phone": "+905551234567"
  }
}
```

**POST** `/api/telegram/send-code`
```json
{
  "phone_number": "+905551234567"
}
```

Response:
```json
{
  "ok": true,
  "success": true,
  "phone_code_hash": "abc123...",
  "message": "Verification code sent"
}
```

**POST** `/api/telegram/sign-in`
```json
{
  "phone_number": "+905551234567",
  "code": "12345",
  "phone_code_hash": "abc123..."
}
```

**POST** `/api/telegram/sign-in-2fa`
```json
{
  "password": "your_2fa_password"
}
```

**POST** `/api/telegram/logout`

#### Data Retrieval

**GET** `/api/telegram/chats?limit=100`

**GET** `/api/telegram/messages/{chat_id}?limit=100`

**GET** `/api/telegram/contacts`

**GET** `/api/telegram/contact/{contact_id}`

**PUT** `/api/telegram/contact/{contact_id}`
```json
{
  "ai_profession": "Software Engineer",
  "ai_sector": "Technology"
}
```

#### Sync

**POST** `/api/telegram/start-sync`

---

## Sorun Giderme

### Backend Başlamıyor

**Sorun**: `ModuleNotFoundError: No module named 'cryptography'`

**Çözüm**:
```bash
pip install -r requirements.txt
```

**Sorun**: `ValueError: TELEGRAM_API_ID not found`

**Çözüm**: `.env` dosyasına Telegram API bilgilerinizi ekleyin

### Login Sorunları

**Sorun**: "Failed to send verification code"

**Çözümler**:
1. İnternet bağlantınızı kontrol edin
2. Telefon numarasını doğru formatta girin (+90...)
3. Telegram API bilgilerinizi kontrol edin

**Sorun**: "Invalid verification code"

**Çözümler**:
1. Kodu tekrar deneyin
2. Yeni kod isteyin (Back → yeniden girin)
3. Telegram uygulamanızda kodu kontrol edin

**Sorun**: "2FA password invalid"

**Çözüm**: Cloud password'ünüzü doğru girdiğinizden emin olun (SMS kodu değil!)

### Session Sorunları

**Sorun**: "Session expired"

**Çözüm**: Logout yapın ve yeniden giriş yapın

**Sorun**: Session kaydetmiyor

**Çözüm**:
```bash
# Permissions kontrol edin
ls -la backend/.telegram_sessions/

# Klasörü yeniden oluşturun
rm -rf backend/.telegram_sessions/
# Backend'i yeniden başlatın
```

### Frontend Sorunları

**Sorun**: "Cannot connect to backend"

**Çözüm**:
1. Backend'in çalıştığından emin olun (`http://localhost:8000`)
2. CORS ayarlarını kontrol edin
3. Browser console'da hata loglarını kontrol edin

**Sorun**: Komponentler render olmuyor

**Çözüm**:
```bash
# Node modules'ı yeniden yükleyin
rm -rf node_modules
npm install
npm start
```

### Desktop App Sorunları

**Sorun**: .exe build alamıyorum

**Çözüm**:
```bash
# Frontend'i önce build edin
cd frontend
npm run build

# Sonra desktop build
cd ../desktop
npm run build:win
```

---

## Gelecek Özellikler

- [ ] Mesaj gönderme
- [ ] Medya indirme
- [ ] AI profilleme backend entegrasyonu
- [ ] Otomatik senkronizasyon
- [ ] Multi-account desteği
- [ ] Push notifications
- [ ] Mesaj arama ve filtreleme
- [ ] Export (PDF, CSV)
- [ ] Analytics dashboard

---

## Destek

Sorun yaşarsanız:

1. [GitHub Issues](https://github.com/kazimincii/telegramsaverbotbeta/issues) açın
2. Log dosyalarını kontrol edin:
   - Backend: `log/telegramsaver.log`
   - Browser Console: F12 → Console
3. Dokümantasyonu tekrar okuyun

---

## Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

---

**Son Güncelleme**: 2025-01-14
**Versiyon**: 2.0.0 (Telegram AI Client)
