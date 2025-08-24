# Telegram Archiver — One Click
1) run-all.bat çift tık. 2) Panel: http://localhost:3000. 3) API ID/HASH gir → Kaydet → Başlat. 4) Kişiler sekmesi → Önizleme → VCF dışa aktar.

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
