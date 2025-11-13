[Unverified] Yapılacaklar listesi (Settings + Tam Özelleştirilebilir Tema)
[Unverified] 1. Tema / config modelini tanımla

[Unverified] Uygulamanın tüm görsel ayarlarını tutacak bir config şeması tanımla (JSON veya benzeri):

[Unverified] colors (primary, secondary, bg, surface, border, accent vs. isimli token’lar)

[Unverified] typography (font family, weight, base size, line-height, letter-spacing)

[Unverified] radius (small/medium/large, chip, card, modal)

[Unverified] spacing (4’lük veya 8’lik grid: xs, sm, md, lg, xl)

[Unverified] shadows, blur, borderWidth, animation (duration, easing)

[Unverified] layout (sidebar genişliği, chat listesi genişliği, panel aralıkları)

[Unverified] Öncelik sırası tanımla:

[Unverified] Default theme → Seçili preset theme → Kullanıcı override’ları → Gelişmiş “Custom code” katmanı.

[Unverified] Config’i tek noktadan okunur hale getir (örneğin themeManager.getToken("colors.primary") gibi).

[Unverified] 2. Settings panel mimarisini çıkar

[Unverified] Uygulama içinde açılan tam ekran sayfa veya modal bir settings alanı tasarla.

[Unverified] Solda kategori listesi, sağda seçili kategorinin detayları olacak klasik layout:

[Unverified] Genel

[Unverified] Görünüm (Tema & Renkler)

[Unverified] Yerleşim (Layout)

[Unverified] Bileşen Stilleri

[Unverified] Kod Entegrasyonu (CSS/JS/HTML)

[Unverified] Profil & Yedekleme

[Unverified] Gelişmiş

[Unverified] Üste bir arama barı ekle (setting ismi yazınca filtrelesin).

[Unverified] Her sayfaya “Reset to default” ve “Değişiklikleri geri al / uygulama” kontrolleri ekle.

[Unverified] 3. Görsel tema (Colors & Typography) ayarları

[Unverified] Renkler:

[Unverified] Primary, secondary, success, warning, error, background, surface, border, text gibi token’lar için color picker.

[Unverified] Hazır palette presetleri (Light, Dark, High-Contrast, Pastel, Neon vb.).

[Unverified] Dark / Light tema arasında geçiş ve “System theme” opsiyonu.

[Unverified] Tipografi:

[Unverified] Font family seçici (sistem fontları + eklenmiş webfont’lar).

[Unverified] Base font size, heading scale (H1–H6 için oran).

[Unverified] Mesaj balonu, menü, sidebar için ayrı font boyutu/density kontrolleri.

[Unverified] 4. Layout & bileşen seviyesinde ayarlar

[Unverified] Genel layout:

[Unverified] Sidebar genişliği, chat listesi genişliği (slider ile).

[Unverified] Tek kolon / iki kolon / üç kolon görünüm presetleri.

[Unverified] Message area padding, kart ve panel aralıkları.

[Unverified] Bileşen bazlı:

[Unverified] Mesaj balonu şekli (radius slider, köşe kırpma opsiyonları).

[Unverified] Avatar boyutu, yuvarlak/kare seçimi.

[Unverified] Buton stilleri (ghost, solid, outline; radius ve shadow).

[Unverified] Input alanı stilleri (border, fill, focus efekti).

[Unverified] 5. Dışarıdan CSS ekleme (Custom CSS Layer)

[Unverified] Ayarlar içinde “Custom CSS” sekmesi aç:

[Unverified] Inline kod alanı (Code editor: syntax highlighting + basic lint).

[Unverified] Dış dosyalar için path seçici (örneğin: user-themes/my-theme.css).

[Unverified] CSS uygulama mantığı:

[Unverified] Uygulama render olduktan sonra en son custom CSS layer inject edilip tüm default stillerin üstüne binsin.

[Unverified] Hata durumunda (bozuk CSS yüzünden layout kayarsa) “Safe Mode: custom CSS olmadan başlat” seçeneği koy.

[Unverified] Küçük bir class name rehberi göster (örneğin “.chat-message, .sidebar, .user-list gibi sınıflar şunları temsil eder” açıklaması).

[Unverified] 6. HTML snippet alanları (slot mantığı)

[Unverified] Uygulamanın belirli noktalarına “slot” tanımla:

[Unverified] Örnek: Header sağ taraf, sidebar alt taraf, chat alanı üst bandı vb.

[Unverified] Settings panelde:

[Unverified] “Header custom HTML”, “Sidebar footer custom HTML” gibi alanlar ekle.

[Unverified] Bu HTML’i sanitize eden basit bir katman ekle (script tag’leri JS sekmesine yönlendir, tehlikeli attribute’ları temizle).

[Unverified] Gerekirse bu alanları mini bir templating ile bağla (örneğin {username}, {activeChatName} gibi placeholder’lar).

[Unverified] 7. Custom JS entegrasyonu (sandbox + event API)

[Unverified] “Custom JS” sekmesi oluştur:

[Unverified] Inline JS editor + dış dosya (örneğin user-scripts/my-theme.js) seçimi.

[Unverified] JS’in erişebileceği sınırlı bir API yüzeyi tanımla:

[Unverified] Örnek: onChatOpen(chat), onMessageRender(message), onThemeChange(theme) event’leri.

[Unverified] Bazı UI helper’lar: ui.setClass(elementId, className), ui.addBadgeToUser(userId, badgeConfig) gibi.

[Unverified] Kodun çalıştığı yer:

[Unverified] Mümkünse ayrı bir sandbox context (ör. Electron ise preload context; web ise iframe + postMessage).

[Unverified] Hata yakalayan ve uyarı veren bir error overlay ekle (JS patlarsa kullanıcı görebilsin).

[Unverified] “Custom JS’i geçici olarak devre dışı bırak” toggle’ı koy.

[Unverified] 8. Profil / tema yönetimi (preset sistemi)

[Unverified] “Theme Profiles” mantığı ekle:

[Unverified] Bir config’i “profil” olarak kaydet (örnek: “Minimal Light”, “Streaming UI”, “Productivity”).

[Unverified] Profil kopyala, yeniden adlandır, sil.

[Unverified] Export / Import:

[Unverified] Tüm ayarları tek JSON dosyası olarak dışa aktar.

[Unverified] Bu JSON’u içeri alıp aynı görünümü başka makinede kullan.

[Unverified] “Read-only preset” fikri:

[Unverified] Uygulamayla gelen default presetler (değiştirilemez, ama kopyalanıp üzerine override yapılabilir).

[Unverified] 9. Kalıcılık, geri alma ve test

[Unverified] Tüm ayarları lokal dosya, DB veya OS’e uygun config lokasyonunda sakla.

[Unverified] Ayar değişikliklerinde:

[Unverified] Live preview (uygulamada anında etki).

[Unverified] “Apply / Cancel” sistemi veya otomatik kayıt + Undo/Redo stack.

[Unverified] Test:

[Unverified] Bozuk JSON / CSS / JS senaryoları için fallback akışları test et.

[Unverified] Farklı çözünürlükler ve scaling oranlarıyla layout bozuluyor mu diye kontrol et.

[Unverified] 10. Dokümantasyon & developer mode

[Unverified] Settings içinde küçük bir “Geliştirici rehberi” sekmesi ekle:

[Unverified] Kullanılabilir CSS class’ları listesi.

[Unverified] Custom JS event API örnekleri.

[Unverified] Basit “ilk tema nasıl yapılır” walkthrough.

[Unverified] İsteğe bağlı “Developer Mode”:

[Unverified] UI üzerinde hover yapınca ilgili component’in adını ve selector’ını gösteren mini inspector.

[Unverified] Ek olarak neler ekleyebiliriz? (Fikir yazısı)

[Unverified] Bu settings panelini sadece “tema değiştirme” aracı değil, küçük bir tasarım stüdyosu gibi konumlandırabilirsin.
[Unverified] Kullanıcıya, sanki kendi mini UI kit’ini ve tasarım dilini yaratıyormuş hissi verecek özellikler eklenebilir.

[Unverified] Kullanım senaryosu presetleri:
[Unverified] “Streamer Mode” (chat büyük, sidebar gizli, koyu tema, büyük fontlar),
[Unverified] “Work Mode” (çoklu sütun, yoğun mesaj listesi, sade renkler),
[Unverified] “Focus Mode” (minimum UI, sadece aktif chat ve basit toolbar) gibi tek tıkla değişen layout + tema kombinasyonları.

[Unverified] Topluluk temaları:
[Unverified] İleride bir “theme marketplace” veya “community themes” bölümü ekleyip kullanıcıların JSON + CSS + JS paketlerini paylaşmasına izin verebilirsin.

[Unverified] Erişilebilirlik (accessibility) araçları:
[Unverified] Renk seçerken contrast skorunu gösteren küçük bir gösterge,
[Unverified] “Düşük dikkat dağıtma modu”,
[Unverified] “Yüksek kontrast” veya “disleksi dostu font” gibi hızlı switch’ler eklenebilir.

[Unverified] Per-context ayarlar:
[Unverified] Belirli gruplar veya workspace’ler için farklı tema profilleri (örneğin “iş gruplarımda sade tema, arkadaş gruplarımda neon çılgınlık” gibi).

[Unverified] Animasyon & micro-interaction kontrolü:
[Unverified] Mesaj geçiş efekti, hover animasyonları ve blur/glas morphizm yoğunluğunu slider’larla yönetmek;
[Unverified] Düşük donanımlı cihazlar için “low animation mode” eklemek.

[Unverified] Debug / Profiling (senin için):
[Unverified] Hangi temaların daha çok kullanıldığı, hangi ayarların hiç dokunulmadığı gibi basic telemetry ile sonraki versiyonları veriyle şekillendirebilirsin.