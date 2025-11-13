# Plugin Development Guide

Complete guide for developing plugins for Telegram Saver Bot.

## Overview

The plugin system allows you to extend the application without modifying core code. Plugins can:
- Listen to download/upload/sync events
- Modify files before/after processing
- Add custom classification logic
- Integrate with third-party services
- Extend functionality dynamically

## Plugin Architecture

### Available Hooks

```python
class PluginHook(Enum):
    # Download hooks
    BEFORE_DOWNLOAD = "before_download"
    AFTER_DOWNLOAD = "after_download"
    DOWNLOAD_ERROR = "download_error"

    # File processing hooks
    BEFORE_SAVE = "before_save"
    AFTER_SAVE = "after_save"

    # Classification hooks
    BEFORE_CLASSIFY = "before_classify"
    AFTER_CLASSIFY = "after_classify"

    # Sync hooks
    BEFORE_SYNC = "before_sync"
    AFTER_SYNC = "after_sync"

    # System hooks
    APP_STARTUP = "app_startup"
    APP_SHUTDOWN = "app_shutdown"
```

## Creating Your First Plugin

### Step 1: Create Plugin File

Create a new Python file in the `plugins/` directory:

```bash
touch plugins/my_plugin.py
```

### Step 2: Implement Plugin Class

```python
from backend.plugin_system import Plugin, PluginHook
import logging

logger = logging.getLogger(__name__)


class MyPlugin(Plugin):
    """My awesome plugin."""

    def __init__(self):
        super().__init__()
        self.name = "MyPlugin"
        self.version = "1.0.0"
        self.author = "Your Name"
        self.description = "Does cool things with downloads"

    def initialize(self) -> bool:
        """Initialize the plugin."""
        logger.info(f"{self.name} v{self.version} initializing...")

        # Register hooks
        self.register_hook(PluginHook.AFTER_DOWNLOAD, self.on_download)
        self.register_hook(PluginHook.BEFORE_SAVE, self.on_before_save)

        return True

    def shutdown(self):
        """Cleanup when plugin is unloaded."""
        logger.info(f"{self.name} shutting down")

    def on_download(self, file_path: str, file_info: dict):
        """Called after a file is downloaded."""
        logger.info(f"Downloaded: {file_path}")
        # Do something with the file
        return file_path

    def on_before_save(self, file_info: dict):
        """Called before saving file metadata."""
        # Modify metadata if needed
        file_info['custom_tag'] = 'processed_by_myplugin'
        return file_info
```

### Step 3: Load Plugin

Via API:
```bash
curl -X POST http://localhost:8000/api/plugins/load \
  -H "Content-Type: application/json" \
  -d '{"module_name": "my_plugin"}'
```

Or programmatically:
```python
plugin_manager.load_plugin("my_plugin")
```

## Plugin Examples

### Example 1: Image Watermark Plugin

```python
from backend.plugin_system import Plugin, PluginHook
from PIL import Image, ImageDraw, ImageFont

class WatermarkPlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "WatermarkPlugin"
        self.version = "1.0.0"
        self.author = "Telegram Saver Team"
        self.description = "Adds watermark to downloaded images"

    def initialize(self) -> bool:
        self.register_hook(PluginHook.AFTER_DOWNLOAD, self.add_watermark)
        return True

    def shutdown(self):
        pass

    def add_watermark(self, file_path: str, file_info: dict):
        # Only process images
        if not file_path.lower().endswith(('.jpg', '.jpeg', '.png')):
            return file_path

        try:
            img = Image.open(file_path)
            draw = ImageDraw.Draw(img)

            # Add watermark text
            text = "© Telegram Saver"
            draw.text((10, 10), text, fill="white")

            img.save(file_path)
            logger.info(f"Added watermark to: {file_path}")
        except Exception as e:
            logger.error(f"Failed to add watermark: {e}")

        return file_path
```

### Example 2: Auto-Backup to S3 Plugin

```python
import boto3
from backend.plugin_system import Plugin, PluginHook

class S3BackupPlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "S3BackupPlugin"
        self.version = "1.0.0"
        self.description = "Automatically backup files to AWS S3"

        # S3 configuration
        self.s3_client = boto3.client('s3')
        self.bucket_name = "my-telegram-backup"

    def initialize(self) -> bool:
        self.register_hook(PluginHook.AFTER_DOWNLOAD, self.backup_to_s3)
        return True

    def shutdown(self):
        pass

    def backup_to_s3(self, file_path: str, file_info: dict):
        try:
            filename = Path(file_path).name
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                filename
            )
            logger.info(f"Backed up to S3: {filename}")
        except Exception as e:
            logger.error(f"S3 backup failed: {e}")

        return file_path
```

### Example 3: Virus Scanner Plugin

```python
import requests
from backend.plugin_system import Plugin, PluginHook

class VirusScanPlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "VirusScanPlugin"
        self.version = "1.0.0"
        self.description = "Scans downloaded files for viruses"

        self.virustotal_api_key = "YOUR_API_KEY"

    def initialize(self) -> bool:
        self.register_hook(PluginHook.AFTER_DOWNLOAD, self.scan_file)
        return True

    def shutdown(self):
        pass

    def scan_file(self, file_path: str, file_info: dict):
        # Only scan executables and archives
        if not file_path.lower().endswith(('.exe', '.zip', '.rar')):
            return file_path

        try:
            # Upload to VirusTotal
            with open(file_path, 'rb') as f:
                files = {'file': f}
                headers = {'x-apikey': self.virustotal_api_key}
                response = requests.post(
                    'https://www.virustotal.com/api/v3/files',
                    files=files,
                    headers=headers
                )

            if response.status_code == 200:
                logger.info(f"Scanned: {file_path}")
            else:
                logger.warning(f"Scan failed: {response.status_code}")

        except Exception as e:
            logger.error(f"Virus scan error: {e}")

        return file_path
```

## API Endpoints

### List Plugins
```bash
GET /api/plugins
```

Response:
```json
{
  "ok": true,
  "plugins": [
    {
      "name": "SamplePlugin",
      "version": "1.0.0",
      "author": "Telegram Saver Team",
      "description": "Example plugin",
      "enabled": true,
      "hooks": ["after_download"]
    }
  ],
  "count": 1
}
```

### Discover Available Plugins
```bash
GET /api/plugins/discover
```

### Load Plugin
```bash
POST /api/plugins/load
Content-Type: application/json

{
  "module_name": "my_plugin"
}
```

### Unload Plugin
```bash
POST /api/plugins/unload
Content-Type: application/json

{
  "plugin_name": "MyPlugin"
}
```

### Enable/Disable Plugin
```bash
POST /api/plugins/enable/{plugin_name}
POST /api/plugins/disable/{plugin_name}
```

### Get Plugin Info
```bash
GET /api/plugins/{plugin_name}
```

## Best Practices

1. **Error Handling**: Always wrap hook callbacks in try-except blocks
2. **Logging**: Use Python's logging module for debugging
3. **Performance**: Keep hook callbacks fast to avoid blocking
4. **Return Values**: Always return modified data from hooks
5. **Dependencies**: Document required packages in plugin docstring
6. **Testing**: Test plugins thoroughly before production use

## Plugin Lifecycle

1. **Discovery**: Plugin manager scans `plugins/` directory
2. **Loading**: Plugin class is instantiated
3. **Initialization**: `initialize()` method is called
4. **Hook Registration**: Plugin registers callbacks for hooks
5. **Runtime**: Hooks are triggered during application events
6. **Shutdown**: `shutdown()` method is called when unloading

## Debugging Tips

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test plugin locally
if __name__ == "__main__":
    plugin = MyPlugin()
    plugin.initialize()

    # Simulate hook trigger
    plugin.on_download("/tmp/test.jpg", {"size": 12345})
```

## Security Considerations

- Plugins run with full application permissions
- Only install trusted plugins
- Review plugin code before loading
- Use sandboxing for untrusted plugins
- Implement plugin signing in production

## Distribution

### Package Structure
```
my-plugin/
├── my_plugin.py
├── README.md
├── requirements.txt
└── LICENSE
```

### requirements.txt
```
Pillow>=10.0.0
boto3>=1.26.0
```

### Installation
```bash
# Copy plugin to plugins directory
cp my_plugin.py /path/to/telegram-saver/plugins/

# Install dependencies
pip install -r requirements.txt

# Load via API
curl -X POST http://localhost:8000/api/plugins/load \
  -H "Content-Type: application/json" \
  -d '{"module_name": "my_plugin"}'
```

## Community Plugins

Submit your plugin to the community repository:
https://github.com/telegram-saver/plugins

## Support

- Plugin API Documentation: See `plugin_system.py`
- Sample Plugins: Check `plugins/sample_plugin.py`
- Issues: Report bugs in the main repository
- Discord: Join our community for help

## License

Plugins inherit the license of the main application unless specified otherwise.
