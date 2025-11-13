"""
Plugin System - Extensible architecture for custom functionality
Allows third-party developers to extend the application without modifying core code
"""
import logging
import json
import importlib
import inspect
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from abc import ABC, abstractmethod
from enum import Enum

logger = logging.getLogger(__name__)


class PluginHook(str, Enum):
    """Available hooks that plugins can listen to."""
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


class Plugin(ABC):
    """Base class for all plugins."""

    def __init__(self):
        self.name = self.__class__.__name__
        self.version = "1.0.0"
        self.author = "Unknown"
        self.description = "No description"
        self.enabled = True
        self.hooks: Dict[PluginHook, Callable] = {}

    @abstractmethod
    def initialize(self) -> bool:
        """
        Initialize the plugin. Called when plugin is loaded.

        Returns:
            True if initialization successful, False otherwise
        """
        pass

    @abstractmethod
    def shutdown(self):
        """Cleanup when plugin is unloaded."""
        pass

    def register_hook(self, hook: PluginHook, callback: Callable):
        """Register a callback for a specific hook."""
        self.hooks[hook] = callback
        logger.info(f"Plugin {self.name} registered hook: {hook}")

    def get_info(self) -> Dict[str, Any]:
        """Get plugin metadata."""
        return {
            "name": self.name,
            "version": self.version,
            "author": self.author,
            "description": self.description,
            "enabled": self.enabled,
            "hooks": [hook.value for hook in self.hooks.keys()]
        }


class PluginManager:
    """Manage plugin lifecycle: discovery, loading, enabling/disabling."""

    def __init__(self, plugins_dir: Path):
        self.plugins_dir = plugins_dir
        self.plugins_dir.mkdir(exist_ok=True, parents=True)

        self.plugins: Dict[str, Plugin] = {}
        self.hook_listeners: Dict[PluginHook, List[Callable]] = {hook: [] for hook in PluginHook}

        # Create sample plugin if directory is empty
        self._create_sample_plugin()

    def _create_sample_plugin(self):
        """Create a sample plugin for reference."""
        sample_path = self.plugins_dir / "sample_plugin.py"
        if not sample_path.exists():
            sample_code = '''"""
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
'''
            sample_path.write_text(sample_code)
            logger.info(f"Created sample plugin at: {sample_path}")

    def discover_plugins(self) -> List[str]:
        """
        Discover available plugins in the plugins directory.

        Returns:
            List of plugin module names
        """
        plugin_files = []

        for file in self.plugins_dir.glob("*.py"):
            if file.name.startswith("_"):
                continue

            module_name = file.stem
            plugin_files.append(module_name)

        logger.info(f"Discovered {len(plugin_files)} plugins: {plugin_files}")
        return plugin_files

    def load_plugin(self, module_name: str) -> bool:
        """
        Load a plugin from a Python module.

        Args:
            module_name: Name of the Python file (without .py)

        Returns:
            True if loaded successfully
        """
        try:
            # Import the module
            module_path = f"plugins.{module_name}"

            # Try to import from plugins directory
            import sys
            sys.path.insert(0, str(self.plugins_dir.parent))

            module = importlib.import_module(module_path)

            # Find Plugin classes
            for name, obj in inspect.getmembers(module):
                if inspect.isclass(obj) and issubclass(obj, Plugin) and obj != Plugin:
                    # Instantiate plugin
                    plugin_instance = obj()

                    # Initialize
                    if plugin_instance.initialize():
                        self.plugins[plugin_instance.name] = plugin_instance

                        # Register all hooks
                        for hook, callback in plugin_instance.hooks.items():
                            self.hook_listeners[hook].append(callback)

                        logger.info(f"Loaded plugin: {plugin_instance.name}")
                        return True
                    else:
                        logger.error(f"Failed to initialize plugin: {plugin_instance.name}")
                        return False

            logger.warning(f"No Plugin class found in module: {module_name}")
            return False

        except Exception as e:
            logger.error(f"Failed to load plugin {module_name}: {e}")
            return False

    def unload_plugin(self, plugin_name: str) -> bool:
        """
        Unload a plugin.

        Args:
            plugin_name: Name of the plugin

        Returns:
            True if unloaded successfully
        """
        if plugin_name not in self.plugins:
            logger.warning(f"Plugin not loaded: {plugin_name}")
            return False

        plugin = self.plugins[plugin_name]

        # Remove hook listeners
        for hook, callback in plugin.hooks.items():
            if callback in self.hook_listeners[hook]:
                self.hook_listeners[hook].remove(callback)

        # Shutdown plugin
        plugin.shutdown()

        # Remove from plugins dict
        del self.plugins[plugin_name]

        logger.info(f"Unloaded plugin: {plugin_name}")
        return True

    def enable_plugin(self, plugin_name: str) -> bool:
        """Enable a plugin."""
        if plugin_name in self.plugins:
            self.plugins[plugin_name].enabled = True
            logger.info(f"Enabled plugin: {plugin_name}")
            return True
        return False

    def disable_plugin(self, plugin_name: str) -> bool:
        """Disable a plugin."""
        if plugin_name in self.plugins:
            self.plugins[plugin_name].enabled = False
            logger.info(f"Disabled plugin: {plugin_name}")
            return True
        return False

    async def trigger_hook(self, hook: PluginHook, *args, **kwargs) -> Any:
        """
        Trigger a hook, calling all registered callbacks.

        Args:
            hook: The hook to trigger
            *args, **kwargs: Arguments to pass to callbacks

        Returns:
            Modified data from callbacks (or original if no modification)
        """
        result = args[0] if args else kwargs

        for callback in self.hook_listeners[hook]:
            # Check if plugin is enabled
            plugin_enabled = any(
                p.enabled and callback in p.hooks.values()
                for p in self.plugins.values()
            )

            if not plugin_enabled:
                continue

            try:
                # Call the callback
                if inspect.iscoroutinefunction(callback):
                    result = await callback(*args, **kwargs)
                else:
                    result = callback(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in plugin hook {hook}: {e}")

        return result

    def list_plugins(self) -> List[Dict[str, Any]]:
        """List all loaded plugins with their info."""
        return [plugin.get_info() for plugin in self.plugins.values()]

    def get_plugin(self, plugin_name: str) -> Optional[Plugin]:
        """Get a plugin by name."""
        return self.plugins.get(plugin_name)


# Usage example:
"""
# 1. Create your plugin in plugins/ directory:

class MyAwesomePlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "MyAwesomePlugin"
        self.version = "1.0.0"
        self.author = "Your Name"
        self.description = "Does awesome things"

    def initialize(self) -> bool:
        # Register hooks
        self.register_hook(PluginHook.AFTER_DOWNLOAD, self.process_download)
        return True

    def shutdown(self):
        pass

    def process_download(self, file_path: str, file_info: dict):
        # Do something with the downloaded file
        print(f"Processing: {file_path}")
        return file_path

# 2. Load plugin:
plugin_manager = PluginManager(Path("plugins"))
plugin_manager.load_plugin("my_awesome_plugin")

# 3. Trigger hooks in your code:
await plugin_manager.trigger_hook(
    PluginHook.AFTER_DOWNLOAD,
    file_path="/path/to/file.jpg",
    file_info={"size": 12345}
)
"""
