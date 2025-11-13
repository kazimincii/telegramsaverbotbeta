"""
Sample Plugin - Example of how to create a plugin
"""
from backend.plugin_system import Plugin, PluginHook
import logging

logger = logging.getLogger(__name__)


class SamplePlugin(Plugin):
    """Sample plugin that logs download events."""

    def __init__(self):
        super().__init__()
        self.name = "SamplePlugin"
        self.version = "1.0.0"
        self.author = "Telegram Saver Team"
        self.description = "Example plugin that logs download events"

    def initialize(self) -> bool:
        """Initialize the plugin."""
        logger.info(f"{self.name} initialized")

        # Register hooks
        self.register_hook(PluginHook.BEFORE_DOWNLOAD, self.on_before_download)
        self.register_hook(PluginHook.AFTER_DOWNLOAD, self.on_after_download)

        return True

    def shutdown(self):
        """Cleanup."""
        logger.info(f"{self.name} shutting down")

    def on_before_download(self, file_info: dict):
        """Called before a file is downloaded."""
        logger.info(f"[SamplePlugin] About to download: {file_info.get('filename')}")
        # You can modify file_info here if needed
        return file_info

    def on_after_download(self, file_path: str, file_info: dict):
        """Called after a file is downloaded."""
        logger.info(f"[SamplePlugin] Downloaded: {file_path}")
