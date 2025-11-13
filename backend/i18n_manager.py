"""
i18n Manager - Internationalization system for multi-language support
Supports: English, Turkish, Spanish, French, German, Russian, Chinese, Japanese
"""
import logging
import json
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class I18nManager:
    """Manage translations and language switching."""

    def __init__(self, translations_dir: Path):
        self.translations_dir = translations_dir
        self.translations_dir.mkdir(exist_ok=True, parents=True)

        self.translations: Dict[str, Dict[str, Any]] = {}
        self.supported_languages = [
            "en", "tr", "es", "fr", "de", "ru", "zh", "ja"
        ]
        self.default_language = "en"

        # Create default translations if not exist
        self._create_default_translations()

        # Load all translations
        self._load_translations()

    def _create_default_translations(self):
        """Create default translation files for all supported languages."""

        # English (default)
        en_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Save, organize, and search your Telegram media",
                "version": "1.0.0"
            },
            "common": {
                "start": "Start",
                "stop": "Stop",
                "pause": "Pause",
                "resume": "Resume",
                "save": "Save",
                "cancel": "Cancel",
                "delete": "Delete",
                "edit": "Edit",
                "search": "Search",
                "upload": "Upload",
                "download": "Download",
                "loading": "Loading...",
                "success": "Success",
                "error": "Error",
                "warning": "Warning",
                "info": "Information"
            },
            "status": {
                "connected": "Connected",
                "disconnected": "Disconnected",
                "running": "Running",
                "stopped": "Stopped",
                "paused": "Paused",
                "idle": "Idle",
                "processing": "Processing"
            },
            "messages": {
                "download_started": "Download started",
                "download_completed": "Download completed successfully",
                "download_failed": "Download failed: {error}",
                "upload_started": "Upload started",
                "upload_completed": "Upload completed successfully",
                "webhook_created": "Webhook created successfully",
                "plugin_loaded": "Plugin loaded: {name}",
                "sync_completed": "Cloud sync completed",
                "no_data": "No data available"
            },
            "sections": {
                "control_panel": "Control Panel",
                "analytics": "Analytics Dashboard",
                "clip_search": "AI-Powered Image Search",
                "webhooks": "Webhook Management",
                "cloud_sync": "Cloud Sync Settings",
                "video_processing": "Video Processing",
                "plugins": "Plugin Manager",
                "settings": "Settings"
            },
            "stats": {
                "total_downloads": "Total Downloads",
                "total_size": "Total Size",
                "media_types": "Media Types",
                "active_chats": "Active Chats",
                "hourly_activity": "Hourly Activity",
                "top_chats": "Top Chats"
            },
            "video": {
                "generate_thumbnail": "Generate Thumbnail",
                "compress_video": "Compress Video",
                "transcribe_audio": "Transcribe Audio",
                "quality": "Quality",
                "processing": "Processing video..."
            },
            "webhook": {
                "create_webhook": "Create Webhook",
                "webhook_url": "Webhook URL",
                "events": "Events",
                "test_webhook": "Test Webhook",
                "webhook_name": "Webhook Name"
            },
            "cloud": {
                "provider": "Cloud Provider",
                "google_drive": "Google Drive",
                "dropbox": "Dropbox",
                "auto_sync": "Auto Sync",
                "manual_sync": "Manual Sync",
                "remote_folder": "Remote Folder",
                "credentials": "Credentials"
            },
            "ipfs": {
                "upload_to_ipfs": "Upload to IPFS",
                "ipfs_cid": "IPFS CID",
                "pin_file": "Pin File",
                "unpin_file": "Unpin File",
                "gateway_url": "Gateway URL"
            },
            "plugins": {
                "available_plugins": "Available Plugins",
                "loaded_plugins": "Loaded Plugins",
                "load_plugin": "Load Plugin",
                "unload_plugin": "Unload Plugin",
                "enable_plugin": "Enable Plugin",
                "disable_plugin": "Disable Plugin"
            }
        }

        # Turkish
        tr_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Telegram medyanızı kaydedin, organize edin ve arayın",
                "version": "1.0.0"
            },
            "common": {
                "start": "Başlat",
                "stop": "Durdur",
                "pause": "Duraklat",
                "resume": "Devam Et",
                "save": "Kaydet",
                "cancel": "İptal",
                "delete": "Sil",
                "edit": "Düzenle",
                "search": "Ara",
                "upload": "Yükle",
                "download": "İndir",
                "loading": "Yükleniyor...",
                "success": "Başarılı",
                "error": "Hata",
                "warning": "Uyarı",
                "info": "Bilgi"
            },
            "status": {
                "connected": "Bağlı",
                "disconnected": "Bağlantı Kesildi",
                "running": "Çalışıyor",
                "stopped": "Durduruldu",
                "paused": "Duraklatıldı",
                "idle": "Boşta",
                "processing": "İşleniyor"
            },
            "messages": {
                "download_started": "İndirme başladı",
                "download_completed": "İndirme başarıyla tamamlandı",
                "download_failed": "İndirme başarısız: {error}",
                "upload_started": "Yükleme başladı",
                "upload_completed": "Yükleme başarıyla tamamlandı",
                "webhook_created": "Webhook başarıyla oluşturuldu",
                "plugin_loaded": "Plugin yüklendi: {name}",
                "sync_completed": "Bulut senkronizasyonu tamamlandı",
                "no_data": "Veri yok"
            },
            "sections": {
                "control_panel": "Kontrol Paneli",
                "analytics": "Analitik Panosu",
                "clip_search": "AI Destekli Görsel Arama",
                "webhooks": "Webhook Yönetimi",
                "cloud_sync": "Bulut Senkronizasyonu",
                "video_processing": "Video İşleme",
                "plugins": "Plugin Yöneticisi",
                "settings": "Ayarlar"
            },
            "stats": {
                "total_downloads": "Toplam İndirmeler",
                "total_size": "Toplam Boyut",
                "media_types": "Medya Türleri",
                "active_chats": "Aktif Sohbetler",
                "hourly_activity": "Saatlik Aktivite",
                "top_chats": "En Çok İndirilen Sohbetler"
            },
            "video": {
                "generate_thumbnail": "Önizleme Oluştur",
                "compress_video": "Video Sıkıştır",
                "transcribe_audio": "Ses Transkripti",
                "quality": "Kalite",
                "processing": "Video işleniyor..."
            },
            "webhook": {
                "create_webhook": "Webhook Oluştur",
                "webhook_url": "Webhook URL",
                "events": "Olaylar",
                "test_webhook": "Webhook Test Et",
                "webhook_name": "Webhook Adı"
            },
            "cloud": {
                "provider": "Bulut Sağlayıcı",
                "google_drive": "Google Drive",
                "dropbox": "Dropbox",
                "auto_sync": "Otomatik Senkronizasyon",
                "manual_sync": "Manuel Senkronizasyon",
                "remote_folder": "Uzak Klasör",
                "credentials": "Kimlik Bilgileri"
            },
            "ipfs": {
                "upload_to_ipfs": "IPFS'e Yükle",
                "ipfs_cid": "IPFS CID",
                "pin_file": "Dosyayı Sabitle",
                "unpin_file": "Sabitlemeden Çıkar",
                "gateway_url": "Gateway URL"
            },
            "plugins": {
                "available_plugins": "Mevcut Pluginler",
                "loaded_plugins": "Yüklenmiş Pluginler",
                "load_plugin": "Plugin Yükle",
                "unload_plugin": "Plugin Kaldır",
                "enable_plugin": "Plugin Etkinleştir",
                "disable_plugin": "Plugin Devre Dışı Bırak"
            }
        }

        # Spanish
        es_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Guarda, organiza y busca tus medios de Telegram",
                "version": "1.0.0"
            },
            "common": {
                "start": "Iniciar",
                "stop": "Detener",
                "pause": "Pausar",
                "resume": "Reanudar",
                "save": "Guardar",
                "cancel": "Cancelar",
                "delete": "Eliminar",
                "edit": "Editar",
                "search": "Buscar",
                "upload": "Subir",
                "download": "Descargar",
                "loading": "Cargando...",
                "success": "Éxito",
                "error": "Error",
                "warning": "Advertencia",
                "info": "Información"
            },
            "status": {
                "connected": "Conectado",
                "disconnected": "Desconectado",
                "running": "Ejecutando",
                "stopped": "Detenido",
                "paused": "Pausado",
                "idle": "Inactivo",
                "processing": "Procesando"
            },
            "messages": {
                "download_started": "Descarga iniciada",
                "download_completed": "Descarga completada exitosamente",
                "download_failed": "Descarga fallida: {error}",
                "upload_started": "Subida iniciada",
                "upload_completed": "Subida completada exitosamente",
                "webhook_created": "Webhook creado exitosamente",
                "plugin_loaded": "Plugin cargado: {name}",
                "sync_completed": "Sincronización en la nube completada",
                "no_data": "No hay datos disponibles"
            },
            "sections": {
                "control_panel": "Panel de Control",
                "analytics": "Panel de Análisis",
                "clip_search": "Búsqueda de Imágenes con IA",
                "webhooks": "Gestión de Webhooks",
                "cloud_sync": "Configuración de Sincronización en la Nube",
                "video_processing": "Procesamiento de Video",
                "plugins": "Gestor de Plugins",
                "settings": "Configuración"
            },
            "stats": {
                "total_downloads": "Descargas Totales",
                "total_size": "Tamaño Total",
                "media_types": "Tipos de Medios",
                "active_chats": "Chats Activos",
                "hourly_activity": "Actividad por Hora",
                "top_chats": "Principales Chats"
            }
        }

        # French
        fr_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Enregistrez, organisez et recherchez vos médias Telegram",
                "version": "1.0.0"
            },
            "common": {
                "start": "Démarrer",
                "stop": "Arrêter",
                "pause": "Pause",
                "resume": "Reprendre",
                "save": "Enregistrer",
                "cancel": "Annuler",
                "delete": "Supprimer",
                "edit": "Modifier",
                "search": "Rechercher",
                "upload": "Téléverser",
                "download": "Télécharger",
                "loading": "Chargement...",
                "success": "Succès",
                "error": "Erreur",
                "warning": "Avertissement",
                "info": "Information"
            },
            "status": {
                "connected": "Connecté",
                "disconnected": "Déconnecté",
                "running": "En cours d'exécution",
                "stopped": "Arrêté",
                "paused": "En pause",
                "idle": "Inactif",
                "processing": "Traitement"
            },
            "messages": {
                "download_started": "Téléchargement démarré",
                "download_completed": "Téléchargement terminé avec succès",
                "download_failed": "Échec du téléchargement: {error}",
                "upload_started": "Téléversement démarré",
                "upload_completed": "Téléversement terminé avec succès",
                "webhook_created": "Webhook créé avec succès",
                "plugin_loaded": "Plugin chargé: {name}",
                "sync_completed": "Synchronisation cloud terminée",
                "no_data": "Aucune donnée disponible"
            },
            "sections": {
                "control_panel": "Panneau de Contrôle",
                "analytics": "Tableau de Bord Analytique",
                "clip_search": "Recherche d'Images IA",
                "webhooks": "Gestion des Webhooks",
                "cloud_sync": "Paramètres de Synchronisation Cloud",
                "video_processing": "Traitement Vidéo",
                "plugins": "Gestionnaire de Plugins",
                "settings": "Paramètres"
            },
            "stats": {
                "total_downloads": "Téléchargements Totaux",
                "total_size": "Taille Totale",
                "media_types": "Types de Médias",
                "active_chats": "Discussions Actives",
                "hourly_activity": "Activité Horaire",
                "top_chats": "Principales Discussions"
            }
        }

        # German
        de_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Speichern, organisieren und durchsuchen Sie Ihre Telegram-Medien",
                "version": "1.0.0"
            },
            "common": {
                "start": "Starten",
                "stop": "Stoppen",
                "pause": "Pausieren",
                "resume": "Fortsetzen",
                "save": "Speichern",
                "cancel": "Abbrechen",
                "delete": "Löschen",
                "edit": "Bearbeiten",
                "search": "Suchen",
                "upload": "Hochladen",
                "download": "Herunterladen",
                "loading": "Laden...",
                "success": "Erfolg",
                "error": "Fehler",
                "warning": "Warnung",
                "info": "Information"
            },
            "status": {
                "connected": "Verbunden",
                "disconnected": "Getrennt",
                "running": "Läuft",
                "stopped": "Gestoppt",
                "paused": "Pausiert",
                "idle": "Leerlauf",
                "processing": "Verarbeitung"
            },
            "messages": {
                "download_started": "Download gestartet",
                "download_completed": "Download erfolgreich abgeschlossen",
                "download_failed": "Download fehlgeschlagen: {error}",
                "upload_started": "Upload gestartet",
                "upload_completed": "Upload erfolgreich abgeschlossen",
                "webhook_created": "Webhook erfolgreich erstellt",
                "plugin_loaded": "Plugin geladen: {name}",
                "sync_completed": "Cloud-Synchronisierung abgeschlossen",
                "no_data": "Keine Daten verfügbar"
            },
            "sections": {
                "control_panel": "Kontrollpanel",
                "analytics": "Analyse-Dashboard",
                "clip_search": "KI-gestützte Bildsuche",
                "webhooks": "Webhook-Verwaltung",
                "cloud_sync": "Cloud-Sync-Einstellungen",
                "video_processing": "Videoverarbeitung",
                "plugins": "Plugin-Manager",
                "settings": "Einstellungen"
            },
            "stats": {
                "total_downloads": "Gesamt-Downloads",
                "total_size": "Gesamtgröße",
                "media_types": "Medientypen",
                "active_chats": "Aktive Chats",
                "hourly_activity": "Stündliche Aktivität",
                "top_chats": "Top-Chats"
            }
        }

        # Russian
        ru_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Сохраняйте, организуйте и ищите медиа из Telegram",
                "version": "1.0.0"
            },
            "common": {
                "start": "Запустить",
                "stop": "Остановить",
                "pause": "Пауза",
                "resume": "Продолжить",
                "save": "Сохранить",
                "cancel": "Отменить",
                "delete": "Удалить",
                "edit": "Редактировать",
                "search": "Поиск",
                "upload": "Загрузить",
                "download": "Скачать",
                "loading": "Загрузка...",
                "success": "Успешно",
                "error": "Ошибка",
                "warning": "Предупреждение",
                "info": "Информация"
            },
            "status": {
                "connected": "Подключено",
                "disconnected": "Отключено",
                "running": "Работает",
                "stopped": "Остановлено",
                "paused": "Приостановлено",
                "idle": "Простой",
                "processing": "Обработка"
            },
            "messages": {
                "download_started": "Загрузка начата",
                "download_completed": "Загрузка успешно завершена",
                "download_failed": "Ошибка загрузки: {error}",
                "upload_started": "Отправка начата",
                "upload_completed": "Отправка успешно завершена",
                "webhook_created": "Webhook успешно создан",
                "plugin_loaded": "Плагин загружен: {name}",
                "sync_completed": "Синхронизация с облаком завершена",
                "no_data": "Нет данных"
            },
            "sections": {
                "control_panel": "Панель управления",
                "analytics": "Панель аналитики",
                "clip_search": "ИИ-поиск изображений",
                "webhooks": "Управление Webhooks",
                "cloud_sync": "Настройки облачной синхронизации",
                "video_processing": "Обработка видео",
                "plugins": "Менеджер плагинов",
                "settings": "Настройки"
            },
            "stats": {
                "total_downloads": "Всего загрузок",
                "total_size": "Общий размер",
                "media_types": "Типы медиа",
                "active_chats": "Активные чаты",
                "hourly_activity": "Почасовая активность",
                "top_chats": "Топ чаты"
            }
        }

        # Chinese (Simplified)
        zh_translations = {
            "app": {
                "name": "Telegram 保存机器人",
                "description": "保存、整理和搜索您的 Telegram 媒体",
                "version": "1.0.0"
            },
            "common": {
                "start": "开始",
                "stop": "停止",
                "pause": "暂停",
                "resume": "继续",
                "save": "保存",
                "cancel": "取消",
                "delete": "删除",
                "edit": "编辑",
                "search": "搜索",
                "upload": "上传",
                "download": "下载",
                "loading": "加载中...",
                "success": "成功",
                "error": "错误",
                "warning": "警告",
                "info": "信息"
            },
            "status": {
                "connected": "已连接",
                "disconnected": "已断开",
                "running": "运行中",
                "stopped": "已停止",
                "paused": "已暂停",
                "idle": "空闲",
                "processing": "处理中"
            },
            "messages": {
                "download_started": "下载已开始",
                "download_completed": "下载成功完成",
                "download_failed": "下载失败: {error}",
                "upload_started": "上传已开始",
                "upload_completed": "上传成功完成",
                "webhook_created": "Webhook 创建成功",
                "plugin_loaded": "插件已加载: {name}",
                "sync_completed": "云同步完成",
                "no_data": "无数据"
            },
            "sections": {
                "control_panel": "控制面板",
                "analytics": "分析仪表板",
                "clip_search": "AI 图像搜索",
                "webhooks": "Webhook 管理",
                "cloud_sync": "云同步设置",
                "video_processing": "视频处理",
                "plugins": "插件管理器",
                "settings": "设置"
            },
            "stats": {
                "total_downloads": "总下载量",
                "total_size": "总大小",
                "media_types": "媒体类型",
                "active_chats": "活跃聊天",
                "hourly_activity": "每小时活动",
                "top_chats": "热门聊天"
            }
        }

        # Japanese
        ja_translations = {
            "app": {
                "name": "Telegram Saver Bot",
                "description": "Telegramメディアを保存、整理、検索",
                "version": "1.0.0"
            },
            "common": {
                "start": "開始",
                "stop": "停止",
                "pause": "一時停止",
                "resume": "再開",
                "save": "保存",
                "cancel": "キャンセル",
                "delete": "削除",
                "edit": "編集",
                "search": "検索",
                "upload": "アップロード",
                "download": "ダウンロード",
                "loading": "読み込み中...",
                "success": "成功",
                "error": "エラー",
                "warning": "警告",
                "info": "情報"
            },
            "status": {
                "connected": "接続済み",
                "disconnected": "切断",
                "running": "実行中",
                "stopped": "停止",
                "paused": "一時停止",
                "idle": "アイドル",
                "processing": "処理中"
            },
            "messages": {
                "download_started": "ダウンロード開始",
                "download_completed": "ダウンロード完了",
                "download_failed": "ダウンロード失敗: {error}",
                "upload_started": "アップロード開始",
                "upload_completed": "アップロード完了",
                "webhook_created": "Webhook作成成功",
                "plugin_loaded": "プラグイン読み込み: {name}",
                "sync_completed": "クラウド同期完了",
                "no_data": "データなし"
            },
            "sections": {
                "control_panel": "コントロールパネル",
                "analytics": "分析ダッシュボード",
                "clip_search": "AI画像検索",
                "webhooks": "Webhook管理",
                "cloud_sync": "クラウド同期設定",
                "video_processing": "動画処理",
                "plugins": "プラグインマネージャー",
                "settings": "設定"
            },
            "stats": {
                "total_downloads": "総ダウンロード数",
                "total_size": "総サイズ",
                "media_types": "メディアタイプ",
                "active_chats": "アクティブチャット",
                "hourly_activity": "時間別アクティビティ",
                "top_chats": "トップチャット"
            }
        }

        # Write translation files
        translations_map = {
            "en": en_translations,
            "tr": tr_translations,
            "es": es_translations,
            "fr": fr_translations,
            "de": de_translations,
            "ru": ru_translations,
            "zh": zh_translations,
            "ja": ja_translations
        }

        for lang_code, translations in translations_map.items():
            file_path = self.translations_dir / f"{lang_code}.json"
            if not file_path.exists():
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(translations, f, ensure_ascii=False, indent=2)
                logger.info(f"Created translation file: {lang_code}.json")

    def _load_translations(self):
        """Load all translation files."""
        for lang_code in self.supported_languages:
            file_path = self.translations_dir / f"{lang_code}.json"
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        self.translations[lang_code] = json.load(f)
                    logger.info(f"Loaded translations for: {lang_code}")
                except Exception as e:
                    logger.error(f"Failed to load {lang_code} translations: {e}")

    def get_translation(self, lang_code: str, key: str, **kwargs) -> str:
        """
        Get translated string for a key.

        Args:
            lang_code: Language code (en, tr, es, etc.)
            key: Translation key in dot notation (e.g., "common.start")
            **kwargs: Format arguments for string interpolation

        Returns:
            Translated string or key if not found
        """
        if lang_code not in self.translations:
            lang_code = self.default_language

        # Navigate nested dict using dot notation
        keys = key.split('.')
        value = self.translations.get(lang_code, {})

        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                value = None
                break

        if value is None:
            logger.warning(f"Translation not found: {lang_code}.{key}")
            return key

        # Apply string formatting if kwargs provided
        if kwargs:
            try:
                return value.format(**kwargs)
            except KeyError as e:
                logger.error(f"Missing format key: {e}")
                return value

        return value

    def get_all_translations(self, lang_code: str) -> Dict[str, Any]:
        """Get all translations for a language."""
        if lang_code not in self.translations:
            lang_code = self.default_language
        return self.translations.get(lang_code, {})

    def get_supported_languages(self) -> List[Dict[str, str]]:
        """Get list of supported languages with metadata."""
        language_info = [
            {"code": "en", "name": "English", "native_name": "English"},
            {"code": "tr", "name": "Turkish", "native_name": "Türkçe"},
            {"code": "es", "name": "Spanish", "native_name": "Español"},
            {"code": "fr", "name": "French", "native_name": "Français"},
            {"code": "de", "name": "German", "native_name": "Deutsch"},
            {"code": "ru", "name": "Russian", "native_name": "Русский"},
            {"code": "zh", "name": "Chinese", "native_name": "中文"},
            {"code": "ja", "name": "Japanese", "native_name": "日本語"}
        ]
        return language_info

    def add_translation(self, lang_code: str, key: str, value: str) -> bool:
        """
        Add or update a translation.

        Args:
            lang_code: Language code
            key: Translation key in dot notation
            value: Translation string

        Returns:
            True if successful
        """
        if lang_code not in self.supported_languages:
            logger.error(f"Unsupported language: {lang_code}")
            return False

        # Initialize if not exists
        if lang_code not in self.translations:
            self.translations[lang_code] = {}

        # Navigate and set value
        keys = key.split('.')
        current = self.translations[lang_code]

        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]

        current[keys[-1]] = value

        # Save to file
        file_path = self.translations_dir / f"{lang_code}.json"
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(self.translations[lang_code], f, ensure_ascii=False, indent=2)
            logger.info(f"Added translation: {lang_code}.{key}")
            return True
        except Exception as e:
            logger.error(f"Failed to save translation: {e}")
            return False


# Usage example:
"""
# Initialize i18n manager
i18n_manager = I18nManager(Path("translations"))

# Get translation
text = i18n_manager.get_translation("tr", "common.start")  # Returns "Başlat"

# Get translation with formatting
msg = i18n_manager.get_translation(
    "en",
    "messages.download_failed",
    error="Connection timeout"
)  # Returns "Download failed: Connection timeout"

# Get all translations for a language
all_tr = i18n_manager.get_all_translations("tr")

# Add new translation
i18n_manager.add_translation("en", "custom.message", "Hello World")
"""
