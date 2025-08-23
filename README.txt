
Telegram Archiver — One‑Click (Windows)
======================================

Bu klasörü **C:\Users\<kullanıcı>\Desktop** gibi basit bir yere çıkarın.

1) İlk giriş (sadece bir kez):
   - `login_once.bat` dosyasına çift tıkla.
   - Telefon numaranı gir, Telegram'ın gönderdiği kodu yaz (gerekirse 2FA şifren).
   - `backend\tg_media.session` oluşur.

2) Başlat:
   - `start_all.bat` dosyasına çift tıkla.
   - İki pencere açılır: **backend** (8000) ve **frontend** (3000).
   - Tarayıcı: http://localhost:3000

3) Durdur:
   - Açılan iki pencereyi kapatabilirsin.
   - veya `stop_all.bat` (deneyseldir) kullan.

Notlar
------
- Scriptler, gerekirse otomatik olarak Python sanal ortamı kurar ve bağımlılıkları yükler.
- Frontend tarafında `npm install` otomatik çalışır (Node.js gerekir).
- Backend yapılandırması UI üzerinden yapılır ve `backend/config.json`’a yazılır.
- Hata durumunda `doctor.bat` ile test/onarım çalıştır.
