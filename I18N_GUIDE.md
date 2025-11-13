# Internationalization (i18n) Guide

Complete guide for using multi-language support in Telegram Saver Bot.

## Overview

The i18n system supports 8 languages with automatic translation management:
- 🇬🇧 English (en)
- 🇹🇷 Turkish (tr)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇷🇺 Russian (ru)
- 🇨🇳 Chinese (zh)
- 🇯🇵 Japanese (ja)

## Features

- ✅ **8 supported languages** with native translations
- ✅ **Automatic language detection** from browser/localStorage
- ✅ **Dynamic language switching** without page reload
- ✅ **Nested translation keys** with dot notation
- ✅ **Parameter interpolation** for dynamic content
- ✅ **Backend API** for translation management
- ✅ **Hot-reload support** for development

## Quick Start

### For Users

1. **Change Language**: Click the 🌐 language selector in the top-right corner
2. **Select Language**: Choose from 8 available languages
3. **Auto-Save**: Your preference is saved to localStorage

### For Developers

#### Using Translations in Frontend

```javascript
import { useLanguage } from "./components/LanguageSelector";

function MyComponent() {
  const { t, currentLanguage } = useLanguage();

  return (
    <div>
      <h1>{t("app.name")}</h1>
      <p>{t("app.description")}</p>
      <button>{t("common.start")}</button>
    </div>
  );
}
```

#### With Parameters

```javascript
const { t } = useLanguage();

// Translation: "Download failed: {error}"
const message = t("messages.download_failed", { error: "Network timeout" });
// Result: "Download failed: Network timeout"
```

## Translation Keys Structure

All translations follow a hierarchical structure:

```json
{
  "app": {
    "name": "Telegram Saver Bot",
    "description": "Save, organize, and search your Telegram media"
  },
  "common": {
    "start": "Start",
    "stop": "Stop",
    "save": "Save"
  },
  "sections": {
    "control_panel": "Control Panel",
    "analytics": "Analytics Dashboard"
  },
  "messages": {
    "download_started": "Download started",
    "download_failed": "Download failed: {error}"
  }
}
```

## Available Translation Categories

### 1. App Metadata
- `app.name` - Application name
- `app.description` - Application description
- `app.version` - Version string

### 2. Common Actions
- `common.start`, `common.stop`, `common.pause`, `common.resume`
- `common.save`, `common.cancel`, `common.delete`, `common.edit`
- `common.search`, `common.upload`, `common.download`
- `common.loading`, `common.success`, `common.error`

### 3. Status Messages
- `status.connected`, `status.disconnected`
- `status.running`, `status.stopped`, `status.paused`
- `status.idle`, `status.processing`

### 4. User Messages
- `messages.download_started`, `messages.download_completed`
- `messages.upload_started`, `messages.upload_completed`
- `messages.webhook_created`, `messages.plugin_loaded`
- `messages.sync_completed`, `messages.no_data`

### 5. Section Titles
- `sections.control_panel`, `sections.analytics`
- `sections.clip_search`, `sections.webhooks`
- `sections.cloud_sync`, `sections.video_processing`
- `sections.plugins`, `sections.settings`

### 6. Statistics
- `stats.total_downloads`, `stats.total_size`
- `stats.media_types`, `stats.active_chats`
- `stats.hourly_activity`, `stats.top_chats`

### 7. Video Processing
- `video.generate_thumbnail`, `video.compress_video`
- `video.transcribe_audio`, `video.quality`

### 8. Webhooks
- `webhook.create_webhook`, `webhook.webhook_url`
- `webhook.events`, `webhook.test_webhook`

### 9. Cloud Sync
- `cloud.provider`, `cloud.google_drive`, `cloud.dropbox`
- `cloud.auto_sync`, `cloud.manual_sync`

### 10. IPFS/Blockchain
- `ipfs.upload_to_ipfs`, `ipfs.ipfs_cid`
- `ipfs.pin_file`, `ipfs.unpin_file`

### 11. Plugins
- `plugins.available_plugins`, `plugins.loaded_plugins`
- `plugins.load_plugin`, `plugins.enable_plugin`

## Backend API

### Get Supported Languages

```bash
GET /api/i18n/languages
```

Response:
```json
{
  "ok": true,
  "languages": [
    {
      "code": "en",
      "name": "English",
      "native_name": "English"
    },
    {
      "code": "tr",
      "name": "Turkish",
      "native_name": "Türkçe"
    }
  ],
  "default": "en"
}
```

### Get All Translations for Language

```bash
GET /api/i18n/translations/{lang_code}
```

Response:
```json
{
  "ok": true,
  "lang_code": "tr",
  "translations": {
    "app": { "name": "Telegram Saver Bot" },
    "common": { "start": "Başlat" }
  }
}
```

### Get Specific Translation

```bash
GET /api/i18n/translate?lang=tr&key=common.start
```

Response:
```json
{
  "ok": true,
  "lang": "tr",
  "key": "common.start",
  "translation": "Başlat"
}
```

### Add/Update Translation

```bash
POST /api/i18n/add-translation
Content-Type: application/json

{
  "lang_code": "en",
  "key": "custom.greeting",
  "value": "Hello, {name}!"
}
```

Response:
```json
{
  "ok": true,
  "message": "Translation added successfully"
}
```

## Adding New Translations

### Method 1: Via API (Recommended)

```bash
curl -X POST http://localhost:8000/api/i18n/add-translation \
  -H "Content-Type: application/json" \
  -d '{
    "lang_code": "en",
    "key": "feature.new_button",
    "value": "Click Here"
  }'
```

### Method 2: Edit Translation Files

Translation files are located in `translations/` directory:

```
translations/
├── en.json  (English)
├── tr.json  (Turkish)
├── es.json  (Spanish)
├── fr.json  (French)
├── de.json  (German)
├── ru.json  (Russian)
├── zh.json  (Chinese)
└── ja.json  (Japanese)
```

Edit the appropriate file:

```json
{
  "custom": {
    "greeting": "Hello, World!",
    "farewell": "Goodbye!"
  }
}
```

The system will automatically reload translations.

## Adding a New Language

To add support for a new language:

### 1. Update Backend (backend/i18n_manager.py)

Add language to `supported_languages`:
```python
self.supported_languages = [
    "en", "tr", "es", "fr", "de", "ru", "zh", "ja", "ar"  # Added Arabic
]
```

Add language info to `get_supported_languages()`:
```python
{"code": "ar", "name": "Arabic", "native_name": "العربية"}
```

### 2. Create Translation File

Create `translations/ar.json`:
```json
{
  "app": {
    "name": "Telegram Saver Bot",
    "description": "احفظ ونظم وابحث عن وسائط Telegram الخاصة بك"
  },
  "common": {
    "start": "ابدأ",
    "stop": "توقف"
  }
}
```

### 3. Test the New Language

```bash
# Get translations
curl http://localhost:8000/api/i18n/translations/ar

# Use in frontend
const { t } = useLanguage();
console.log(t("common.start"));  // Should return "ابدأ" when Arabic is selected
```

## Best Practices

### 1. Use Descriptive Keys

✅ Good:
```javascript
t("messages.download_completed")
t("sections.analytics_dashboard")
```

❌ Bad:
```javascript
t("msg1")
t("section2")
```

### 2. Keep Translations Short

✅ Good: `"Save"`, `"Download"`, `"Upload"`

❌ Bad: `"Please click this button to save your file to the database"`

### 3. Use Parameters for Dynamic Content

✅ Good:
```javascript
t("messages.file_downloaded", { filename: "photo.jpg", size: "2.5MB" })
// Translation: "Downloaded {filename} ({size})"
```

❌ Bad:
```javascript
"Downloaded " + filename + " (" + size + ")"  // Hard to translate
```

### 4. Group Related Translations

✅ Good:
```json
{
  "video": {
    "compress": "Compress",
    "thumbnail": "Generate Thumbnail",
    "transcribe": "Transcribe Audio"
  }
}
```

❌ Bad:
```json
{
  "video_compress": "Compress",
  "video_thumbnail": "Generate Thumbnail"
}
```

### 5. Test All Languages

Always test new features in multiple languages to ensure:
- Text fits in UI elements
- Right-to-left (RTL) languages display correctly
- Special characters render properly
- Pluralization works as expected

## Language-Specific Considerations

### Right-to-Left (RTL) Languages

For Arabic, Hebrew, etc., you may need to add RTL support:

```javascript
const { currentLanguage } = useLanguage();
const isRTL = ["ar", "he", "fa"].includes(currentLanguage);

<div style={{ direction: isRTL ? "rtl" : "ltr" }}>
  {content}
</div>
```

### Character Encoding

All translation files use UTF-8 encoding. Ensure your editor is configured correctly.

### Pluralization

For languages with complex plural rules, use parameters:

```json
{
  "items_count": "{count} item(s)"
}
```

Then handle logic in code:
```javascript
const count = 5;
const plural = count === 1 ? "item" : "items";
t("items_message", { count, plural });
```

## Debugging

### Enable Debug Logging

```javascript
// In LanguageSelector.js
useEffect(() => {
  console.log("Current language:", currentLanguage);
  console.log("Loaded translations:", translations);
}, [currentLanguage, translations]);
```

### Check Translation Loading

```bash
# View logs
tail -f log/telegramsaver.log | grep i18n

# Expected output:
# INFO - Loaded translations for: en
# INFO - Loaded translations for: tr
```

### Test Translation Keys

```bash
# Test a specific key
curl "http://localhost:8000/api/i18n/translate?lang=tr&key=common.start"

# Test all translations
curl http://localhost:8000/api/i18n/translations/tr
```

## Performance

- **Lazy Loading**: Translations are loaded only when language is selected
- **Caching**: Browser caches translations in localStorage
- **Bundle Size**: ~50KB per language (gzipped)
- **Load Time**: <100ms for language switching

## Migration Guide

### Migrating Existing Components

Before:
```javascript
function MyComponent() {
  return <button>Start Download</button>;
}
```

After:
```javascript
import { useLanguage } from "./components/LanguageSelector";

function MyComponent() {
  const { t } = useLanguage();
  return <button>{t("actions.start_download")}</button>;
}
```

## Troubleshooting

### Translation Not Found

**Problem**: Key returns as-is instead of translation

**Solution**:
1. Check key exists in translation file
2. Verify language is loaded
3. Check for typos in key path

### Language Not Switching

**Problem**: UI doesn't update after language change

**Solution**:
1. Ensure component uses `useLanguage()` hook
2. Check LanguageProvider wraps your app
3. Clear localStorage and refresh

### Missing Translations

**Problem**: Some translations missing in new language

**Solution**:
1. Copy missing keys from `en.json`
2. Translate the values
3. Test with `curl http://localhost:8000/api/i18n/translations/{lang}`

## Support

For issues or questions:
- Check translation files in `translations/` directory
- Review backend logs: `log/telegramsaver.log`
- Test API endpoints with curl
- Report bugs in the main repository

## License

The i18n system inherits the license of the main application.

## Contributing Translations

To contribute translations:

1. Fork the repository
2. Add/update translation files in `translations/`
3. Test thoroughly
4. Submit a pull request

Translation quality checklist:
- [ ] All keys from `en.json` are translated
- [ ] Translations are natural and idiomatic
- [ ] Text fits in UI elements
- [ ] Special characters render correctly
- [ ] Tested in actual application

Thank you for helping make Telegram Saver Bot accessible to users worldwide! 🌍
