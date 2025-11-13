[Roadmap] Mevcut Repoya Telegram Tabanlı AI Contact Intelligence Client Entegrasyonu
0. Amaç (Ürün Tanımı)

[Inference] Elimizde halihazırda çalışan bir repo var (web tabanlı bir AI-first üretkenlik / knowledge / otomasyon altyapısı). Bu reposunun üzerine, aşağıdaki özelliklere sahip bir Telegram tabanlı AI Contact Intelligence Client eklemek istiyorum:

Telegram hesabıma bağlanacak küçük bir istemci (desktop/web arayüzlü).

İçinde bulunduğum gruplardaki:

kişileri,

mesajları,

dosya ve fotoğrafları
otomatik olarak toplayıp depolayacak.

Yapay zeka; gruplarda yazdıkları mesajlardan yola çıkarak kişilerin muhtemel mesleğini / iş alanını tahmin edecek ve bunu “kişiler listesi” arayüzünde filtrelenebilir bir alan olarak kaydedecek.

Sistem; uzun vadede, kişisel bir Telegram CRM + knowledge base gibi çalışacak.

1. Genel Mimari Kararları

[Inference] Claude’dan beklentim: Mevcut repo mimarisini bozmadan, bu yeni özelliği modüler bir alt sistem olarak tasarlayıp entegre etmesi.

1.1. Katmanlar

Core Service (Backend)

Telegram bağlantısı (Telethon veya benzeri MTProto client).

DB katmanı (başlangıç için SQLite veya mevcut DB neyse ona uygun şema).

AI/LLM entegrasyonu (meslek tahmini, özetleme, keyword çıkarma).

Client UI

Mevcut repo hangi stack’i kullanıyorsa (React / Next / Electron / Tauri vs.), yeni “Telegram” sekmesi / ekranı eklenecek.

Storage

Mesajlar, kullanıcılar, gruplar, AI profilleri için ilişkisel/NoSQL DB.

Medyalar için disk tabanlı klasör yapısı (örn. storage/telegram/media/...).

1.2. Entegrasyon İlkeleri

Mevcut repo’nun auth, config, logging, error handling yaklaşımına uy.

Telegram kısmını mümkün olduğunca izole bir modül olarak tasarla:

Örn. backend/telegram/ veya apps/telegram_client/.

AI servis çağrılarını mevcut AI/LLM abstraction katmanına entegre et (varsa).

Feature flag’ler ile açılıp kapatılabilir olsun (örn. .env → TELEGRAM_FEATURE_ENABLED).

2. Data Model ve Şema Tasarımı

[Inference] Claude’dan, mevcut DB yapısına uygun şekilde aşağıdaki tabloları/model’leri tanımlamasını istiyorum (isimler örnek, mevcut pattern’e göre uyarlasın):

2.1. Temel Tablolar

telegram_chats

id (internal PK)

telegram_chat_id

type (group, supergroup, channel, private)

title

username (varsa)

is_active

created_at, updated_at

telegram_users

id (internal PK)

telegram_user_id

username

first_name

last_name

bio (opsiyonel)

language_code (opsiyonel)

last_seen_at

created_at, updated_at

telegram_messages

id (PK)

telegram_message_id

chat_id (FK → telegram_chats.id)

sender_id (FK → telegram_users.id)

sent_at

text_raw

reply_to_message_id (opsiyonel)

has_media (bool)

media_type (photo, document, video, sticker, etc.)

ai_summary (opsiyonel kısa özet)

ai_keywords (JSON array)

ai_processed (bool)

created_at, updated_at

telegram_files

id

message_id (FK → telegram_messages.id)

file_type

file_path (lokal path)

file_size

mime_type

ai_caption (opsiyonel)

ai_tags (JSON)

created_at, updated_at

2.2. AI Profil Tablosu (Meslek Tahmini)

telegram_user_ai_profiles

id

user_id (FK → telegram_users.id)

job_label (örneğin: "iç mimar", "full-stack developer")

sector (örneğin: "mimarlık", "yazılım geliştirme")

confidence (0–100 integer)

evidence_keywords (JSON array, örn: ["3ds max", "render", "şantiye"])

last_analyzed_at

manual_override (bool)

manual_job_label (varsa)

manual_sector (varsa)

2.3. Embedding / Vector Store (İlerisi İçin)

Eğer repoda halihazırda vektör arama / embedding katmanı varsa:

telegram_message_embeddings

message_id

embedding (mevcut modele uygun)

Bu kısım roadmap’te opsiyonel; önce temel profil + listeleme bitsin.

3. Telegram Entegrasyonu (Core Servis)

[Inference] Claude’dan, backend tarafında aşağıdaki bileşenleri oluşturmasını istiyorum:

3.1. Telegram Client Config

.env veya mevcut config sistemine:

TELEGRAM_API_ID

TELEGRAM_API_HASH

TELEGRAM_SESSION_NAME (örnek: "local_session")

TELEGRAM_ALLOWED_CHAT_IDS veya TELEGRAM_ALLOWED_CHAT_USERNAMES (whitelist mantığı)

3.2. Sync Servisi (Batch + Realtime)

sync_telegram_chats():

Tüm dialog’ları listeler

Whitelist’e göre takip edilecek grupları telegram_chats tablosuna yazar/günceller.

sync_telegram_participants(chat):

Belirli bir gruptaki kullanıcıları telegram_users tablosuna yazar/günceller.

sync_telegram_history(chat):

Belirli bir gruptaki geçmiş mesajları (limit=None veya parametreli) telegram_messages tablosuna kaydeder.

Media varsa telegram_files tablosuna kayıt açar ve dosyayı diske indirir.

listen_telegram_realtime():

NewMessage event’lerini dinler.

Yeni mesajları ve medyayı aynı şemaya göre kaydeder.

Yeni kayıtları AI işlem kuyruğuna işaretler (örn. ai_processed = false).

Bu fonksiyonlar, mümkünse ayrı bir servis / worker process olarak çalışsın (örn. telegram_sync_service.py).

4. AI Katmanı: Meslek Tahmini ve Özetleme

[Inference] Burada Claude’dan dört temel işlev bekliyorum:

4.1. Tek Kullanıcı İçin Mesaj Seti Toplama

Fonksiyon: get_user_message_corpus(user_id, limit=100, days_back=90, min_length=20)

Son X mesajı alır.

Çok kısa / anlamsız / emoji-only mesajları filtreler.

Tek bir uzun metin veya madde madde mesaj listesi döner.

4.2. LLM Prompt Tasarımı (Meslek Çıkarımı)

LLM’e gönderilecek prompt mantığı:

Kullanıcının mesajlarından:

Muhtemel meslek / pozisyon (kısa)

Muhtemel sektör / domain

Tahmin güveni (0–100)

Bu tahmini destekleyen anahtar kelimeler / cümle parçaları

Cevap formatı JSON olacak.

Claude’dan, repoda kullanılan LLM abstraction’a uygun bir infer_user_job_profile(user_id) fonksiyonu yazmasını istiyorum:

Mesajları toplasın.

Prompt’u hazırlasın.

LLM cevabını parse edip telegram_user_ai_profiles tablosuna kaydetsin.

4.3. Mesaj Özetleme + Keyword Çıkarma

process_message_for_ai(message_id) fonksiyonu:

Tek bir mesaj + context (örn. reply ettiği mesaj) üzerinden kısa bir özet üretsin.

3–7 arası keyword çıkarsın.

Sonucu ai_summary ve ai_keywords alanlarına yazsın.

Bu fonksiyon, yeni mesajlar için background worker’da otomatik çalışsın.

4.4. Worker / Queue Mantığı

Basit bir queue yaklaşımı:

telegram_messages.ai_processed = false olanlar batch halinde işlenir.

telegram_user_ai_profiles.last_analyzed_at’i eski olan ve belirli eşik üstünde mesajı olan kullanıcılar periyodik olarak tekrar analiz edilir (ör. günde 1 kez max).

5. Client UI – Telegram CRM Ekranları

[Inference] Mevcut front-end stack neyse, Claude’dan buna uygun bileşenleri eklemesini istiyorum. Minimum hedef:

5.1. “Telegram” Ana Sekmesi

Sol tarafta:

Takip edilen grupların listesi (telegram_chats)

Orta panel:

Seçili grubun mesaj listesi

Basit filtreler (sadece media, sadece link içeren mesajlar vs.)

Sağ panel:

Seçili mesajın detayları + AI summary + keywords.

5.2. “Kişiler” Sekmesi (Contact Intelligence)

Üst filtreler:

Meslek (job_label / manual_job_label üzerinden dropdown)

Sektör filtresi

Confidence slider (örn. %0–%100)

Liste:

Satırlar:

Ad Soyad

Username

AI Meslek etiketi (job_label + confidence)

Manual override var mı?

Satıra tıklayınca sağ panel:

Kullanıcı detayları (id, username, gruplar)

AI tahmini:

Job label + sector + confidence

Evidence keywords listesi

Son X mesaj (önemli olanlar)

“Mesleği elle düzelt” input alanı:

Kaydettiğinde manual_override=true, manual_job_label doldurulur.

5.3. UX Detayları

AI tahmini her yerde “AI guess” / “AI tahmini” gibi etiketlenmeli; kesin bilgi gibi sunulmamalı.

Kişi listesinde AI tahmini olmayanlar için:

“Henüz analiz edilmedi” veya “Yetersiz veri” badge’i.

Manuel override yapıldığında:

Listede “(manuel)” ibaresi.

6. Güvenlik, Rate Limit ve Ayarlar

[Inference] Claude’dan, aşağıdaki konularda da temel altyapıyı kurmasını istiyorum:

Rate Limit

LLM çağrılarını sınırlayan bir katman:

Örn. dakikada X, saatte Y istek.

Privacy / Opt-out

Kullanıcı bazlı “ignore” flag:

Örn. telegram_users.is_ignored

Bu kullanıcıların mesajları AI tarafında kullanılmasın.

Config Panel

UI içinde küçük bir ayarlar ekranı:

“Telegram sync aktif/pasif”

“Meslek tahmini için minimum mesaj sayısı”

“Günlük maksimum kullanıcı analizi”

7. Milestone Bazlı Yol Haritası

[Inference] Claude’dan, geliştirmeyi aşağıdaki fazlar halinde planlamasını ve her faz için PR/commit önermesini istiyorum:

Faz 1 – Altyapı & DB

Yeni DB tablolarını oluştur (migration dosyaları).

backend/telegram/ altında temel yapı:

config

client init

basic test connection script

Faz 2 – Sync Servisi (History + Realtime)

Chat, user, message, file modellerini bağla.

Belirli bir whitelist gruptan:

Geçmiş mesajları çek.

Media indir.

Realtime dinleme altyapısını kur (isteğe bağlı toggle).

Faz 3 – AI Mesaj İşleme

process_message_for_ai(message_id) fonksiyonunu yaz.

Queue/worker mantığını kur.

Basit bir komut veya admin endpoint ile:

“Şu son 500 mesajı işle” tarzı batch işleme yap.

Faz 4 – AI Meslek Tahmini

get_user_message_corpus fonksiyonu.

infer_user_job_profile(user_id) fonksiyonu.

Basit admin endpoint:

“Bu kullanıcıyı yeniden analiz et”

“Tüm kullanıcıları sıra ile analiz et (limitli)”.

Faz 5 – Client UI (Telegram & People)

“Telegram” ana sekmesi:

Chat & message listesi

“People / Contacts” sekmesi:

AI meslek etiketli kişi listesi

Detay paneli

Manuel override formu

Faz 6 – Temizlik, Dokümantasyon ve Gelişmiş Özellikler

Kod temizliği, error handling, logging.

Base dokümantasyon:

docs/telegram-client-overview.md

“Kurulum, .env, ilk login, sync başlatma, AI ayarları”

İleride eklenecek özellikler için kısa bir backlog:

Vektör arama ve “chat with your Telegram graph”

Gelişmiş medya galerisi

Otomatik “iş için potansiyel” flag’leri vb.

8. Claude’dan Beklentim (Özet)

[Inference] Claude’dan şunları istiyorum:

Mevcut repo yapısını okuyup (dosya/klasör yapısı, stack, DB) yukarıdaki roadmap’i repo’ya adapte etsin.

Her faz için:

Yeni dosyaları oluştursun.

Gerekli kodları yazsın.

Varsa mevcut servislere entegre edecek değişiklikleri net ve temiz şekilde uygulasın.

AI ile ilgili kısımlarda:

Prompt tasarımlarını dosya içinde açık bırakmasını (yorum satırı ile).

“Bu kısım API key gerektirir” gibi noktaları net işaret etmesini.

Tüm geliştirmeyi, future-proof olacak şekilde modüler, okunabilir ve test edilebilir hale getirmesini.
