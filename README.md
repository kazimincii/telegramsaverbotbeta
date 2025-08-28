# Telegram Archiver — One Click
1) run-all.bat çift tık. 2) Panel: http://localhost:3000. 3) API ID/HASH gir → Kaydet → Başlat. 4) Kişiler sekmesi → Önizleme → VCF dışa aktar.

## Backend Configuration

Backend ayarları `backend/config.json` dosyasında saklanır. Başlamadan önce örnek dosyayı kopyalayın ve düzenleyin:

```bash
cp backend/config.example.json backend/config.json
# backend/config.json'u düzenleyip kendi Telegram API ID ve API HASH değerlerinizi girin
```

## Frontend Environment

The React frontend reads the backend URL from the `REACT_APP_API_BASE` variable.

Examples:

| Environment | Example Value |
|-------------|---------------|
| Local       | `http://127.0.0.1:8000` |
| Production  | `https://api.example.com` |

Before building or starting the frontend, copy the sample environment file and adjust the URL:

```bash
cp frontend/.env.example frontend/.env
# edit frontend/.env and set REACT_APP_API_BASE as needed
```

## Code Maintenance

Tüm kod tabanını hızlıca kontrol etmek veya biçimlendirmek için `maintainer.py` aracını kullanın.

```bash
# sorunları bulmak için
python maintainer.py check

# otomatik düzeltme yapmak için
python maintainer.py fix
```

`check` komutu hem Python backend'i hem de React frontend'i için testleri ve statik analizleri çalıştırır. `fix` komutu ise uygun araçlar mevcutsa otomatik biçimlendirme ve lint düzeltmeleri uygular.

## Masaüstü Uygulaması

Frontend'i masaüstünde çalıştırmak için React uygulamasını derleyip Electron ile açabilirsiniz:

```bash
cd frontend
npm run build
cd ../desktop
npm install
npm start
```

## Servis Kurulumu

### Systemd
1. `deploy/telegramsaver.service` dosyasını `/etc/systemd/system/` klasörüne kopyalayın.
2. Servisi etkinleştirip başlatın:
   ```bash
   sudo systemctl enable telegramsaver
   sudo systemctl start telegramsaver
   ```
3. Günlükleri izlemek için:
   ```bash
   tail -f log/telegramsaver.log
   ```

### PM2
1. PM2 ile başlatmak için:
   ```bash
   pm2 start deploy/ecosystem.config.js
   ```
2. Durdurmak için:
   ```bash
   pm2 stop telegramsaver
   ```
3. PM2 günlüklerini izlemek için:
   ```bash
   pm2 logs telegramsaver
   ```

### Logrotate
`deploy/logrotate/telegramsaver` dosyasını `/etc/logrotate.d/` klasörüne kopyalayarak log dosyalarının otomatik döndürülmesini sağlayabilirsiniz.

### Doğrulama
Konfigürasyon dosyalarını test etmek için:
```bash
bash deploy/tests/test_service_scripts.sh
```

## Troubleshooting

codex/add-cmd-check-to-batch-files
### `cmd.exe bulunamadi` mesaji

Betik dosyalari Windows icin tasarlanmistir ve `cmd.exe` gerektirir. Bu hata gorunuyorsa komutlari bir Windows komut isteminde calistirdiginizdan ve `cmd.exe`'nin PATH icinde oldugundan emin olun.

If you receive a `0xc0000142` error when launching the program, it indicates a Windows startup issue that occurs *before* the application code runs. To resolve it:

- Run **System File Check** (`sfc /scannow`) to repair corrupted system files.
- Reinstall the latest **Microsoft Visual C++ Redistributable** packages.
- Add the application folder to your antivirus software's **exclusion list**.

Because this error originates from Windows itself, verify that your operating system is healthy and fully updated before trying to run the application again.
main
