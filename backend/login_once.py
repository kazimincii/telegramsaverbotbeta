import os, sys, asyncio, time, logging
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneNumberBannedError

logger = logging.getLogger(__name__)


def _get_api_id():
    api_id_str = os.environ.get("API_ID")
    if api_id_str:
        try:
            return int(api_id_str)
        except ValueError:
            print("[!] API_ID must be an integer.", file=sys.stderr)
            sys.exit(1)

    while True:
        api_id_str = input("API ID: ").strip()
        try:
            return int(api_id_str)
        except ValueError:
            print("[!] API_ID must be an integer.")


API_ID = _get_api_id()
API_HASH = os.environ.get("API_HASH") or input("API HASH: ").strip()
SESSION = os.environ.get("SESSION") or "tg_media"

# İsteğe bağlı: QR'ı PNG olarak kaydetmek için qrcode (kurulu değilse try/except)
def save_qr_png(url, path="qr_login.png"):
    try:
        import qrcode
    except ImportError:
        print("[i] 'qrcode' kurulu değil; QR URL aşağıda görünecek.")
        return

    try:
        qrcode.make(url).save(path)
        print(f"[i] QR PNG oluşturuldu: {path}")
    except Exception as exc:
        logger.exception("Failed to save QR PNG: %s", exc)

async def main():
    async with TelegramClient(SESSION, API_ID, API_HASH) as client:
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"[ok] Zaten yetkili: {getattr(me,'username',None) or me.first_name}")
            return

        print("\nTelegram uygulamasında: Ayarlar > Cihazlar > Masaüstü cihaz bağla > QR'ı tara")
        # İlk QR oluştur
        qr = await client.qr_login()
        print("QR URL:", qr.url)
        save_qr_png(qr.url)

        # QR belirli aralıklarla yenilenir; login olana kadar bekle
        start = time.time()
        while True:
            try:
                await qr.wait()              # taranırsa burada döner
                break
            except Exception as exc:
                logger.warning("qr.wait failed: %s", exc)
                # Süresi doldu; yeniden üret
                if time.time() - start > 180:  # 3 dk sonra vazgeç
                    print("[!] Süre doldu. Tekrar deneyin.")
                    return
                qr = await client.qr_login()
                print("QR yenilendi. URL:", qr.url)
                save_qr_png(qr.url)

        # 2FA şifresi aktifse
        try:
            if not await client.is_user_authorized():
                raise RuntimeError("Yetkilendirme başarısız")
        except SessionPasswordNeededError:
            pwd = input("İki adımlı doğrulama şifresi: ").strip()
            await client.sign_in(password=pwd)

        me = await client.get_me()
        print(f"[ok] Giriş başarılı: {getattr(me,'username',None) or me.first_name}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except PhoneNumberBannedError:
        print("\n[!] Bu hesap API ile girişe yasaklı görünüyor (PhoneNumberBannedError). "
              "QR de başarısız olursa farklı bir hesap kullanın veya Telegram destek ile iletişime geçin:\n"
              "    https://www.telegram.org/faq_spam\n")
        sys.exit(2)
    except KeyboardInterrupt:
        pass
