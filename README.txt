Telegram Archiver — One‑Click (Windows)
======================================

Bu klasörü **C:\\Users\\<kullanıcı>\\Desktop** gibi basit bir yere çıkarın.

1) Konfigürasyon:
   - `backend\\config.example.json` dosyasını `backend\\config.json` olarak kopyalayın.
   - Dosyayı açıp kendi API ID ve API HASH değerlerinizi yazın.

2) İlk giriş (sadece bir kez):
   - `login_once.bat` dosyasına çift tıkla.
   - Telefon numaranı gir, Telegram'ın gönderdiği kodu yaz (gerekirse 2FA şifren).
   - `backend\\tg_media.session` oluşur.

3) Başlat:
   - `start_all.bat` dosyasına çift tıkla.
   - İki pencere açılır: **backend** (8000) ve **frontend** (3000).
   - Tarayıcı: http://localhost:3000

4) Durdur:
   - Açılan iki pencereyi kapatabilirsin.
   - veya `stop_all.bat` (deneyseldir) kullan.

Notlar
------
- Scriptler, gerekirse otomatik olarak Python sanal ortamı kurar ve bağımlılıkları yükler.
- Frontend tarafında `npm install` otomatik çalışır (Node.js gerekir).
- Backend yapılandırması `backend/config.json`’da tutulur; örnek dosyayı kopyalayarak başlayın.
- Hata durumunda `doctor.bat` ile test/onarım çalıştır.
