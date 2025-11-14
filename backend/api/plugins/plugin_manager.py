"""
Plugin System & Extensions Manager
Handles plugin lifecycle, marketplace, and custom extensions
"""
import json
import os
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import secrets
import hashlib


class PluginStatus(Enum):
    """Plugin status"""
    INACTIVE = "inactive"
    ACTIVE = "active"
    DISABLED = "disabled"
    ERROR = "error"
    UPDATING = "updating"


class PluginCategory(Enum):
    """Plugin categories"""
    UTILITY = "utility"
    MEDIA = "media"
    AUTOMATION = "automation"
    INTEGRATION = "integration"
    UI = "ui"
    ANALYTICS = "analytics"
    SECURITY = "security"
    CUSTOM = "custom"


class PermissionLevel(Enum):
    """Plugin permission levels"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    SYSTEM = "system"


@dataclass
class PluginManifest:
    """Plugin manifest/metadata"""
    plugin_id: str
    name: str
    version: str
    description: str
    author: str
    category: str

    # Requirements
    min_version: str
    dependencies: List[str]
    permissions: List[str]

    # URLs and resources
    homepage: Optional[str]
    repository: Optional[str]
    icon_url: Optional[str]

    # Entry points
    main_file: str
    config_schema: Dict[str, Any]

    def to_dict(self):
        return asdict(self)


@dataclass
class Plugin:
    """Plugin representation"""
    plugin_id: str
    manifest: Dict[str, Any]
    status: str
    installed_at: str
    updated_at: str
    installed_by: str

    # Configuration
    config: Dict[str, Any]
    enabled: bool
    auto_update: bool

    # Statistics
    install_count: int
    rating: float
    reviews_count: int

    # Runtime
    load_time_ms: float
    memory_usage_mb: float
    api_calls_count: int
    errors_count: int

    # Metadata
    tags: List[str]
    metadata: Dict[str, Any]

    def to_dict(self):
        return asdict(self)


@dataclass
class ExtensionHook:
    """Extension hook point"""
    hook_id: str
    hook_name: str
    hook_type: str
    description: str
    parameters: List[Dict[str, Any]]
    registered_plugins: List[str]
    execution_order: List[str]
    created_at: str

    def to_dict(self):
        return asdict(self)


@dataclass
class PluginMarketplace:
    """Marketplace plugin listing"""
    listing_id: str
    plugin_id: str
    name: str
    description: str
    version: str
    author: str
    category: str

    # Pricing
    price: float
    is_free: bool
    license_type: str

    # Stats
    downloads: int
    rating: float
    reviews_count: int

    # Media
    screenshots: List[str]
    video_url: Optional[str]

    # Metadata
    tags: List[str]
    featured: bool
    verified: bool
    created_at: str
    updated_at: str

    def to_dict(self):
        return asdict(self)


@dataclass
class PluginEvent:
    """Plugin event log"""
    event_id: str
    plugin_id: str
    event_type: str
    timestamp: str
    user_id: str
    details: Dict[str, Any]
    success: bool
    error_message: Optional[str]

    def to_dict(self):
        return asdict(self)


class PluginManager:
    """Plugin System & Extensions Manager"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PluginManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.data_dir = "data/plugins"
        os.makedirs(self.data_dir, exist_ok=True)

        self.plugins: Dict[str, Plugin] = {}
        self.hooks: Dict[str, ExtensionHook] = {}
        self.marketplace: Dict[str, PluginMarketplace] = {}
        self.events: List[PluginEvent] = []

        self._load_data()
        self._initialize_hooks()
        self._initialized = True

    def _load_data(self):
        """Load plugin data from disk"""
        try:
            plugins_file = os.path.join(self.data_dir, "plugins.json")
            if os.path.exists(plugins_file):
                with open(plugins_file, 'r') as f:
                    data = json.load(f)
                    self.plugins = {k: Plugin(**v) for k, v in data.items()}

            hooks_file = os.path.join(self.data_dir, "hooks.json")
            if os.path.exists(hooks_file):
                with open(hooks_file, 'r') as f:
                    data = json.load(f)
                    self.hooks = {k: ExtensionHook(**v) for k, v in data.items()}
        except Exception as e:
            print(f"Error loading plugin data: {e}")

    def _save_data(self):
        """Save plugin data to disk"""
        try:
            plugins_file = os.path.join(self.data_dir, "plugins.json")
            with open(plugins_file, 'w') as f:
                json.dump({k: v.to_dict() for k, v in self.plugins.items()}, f, indent=2)

            hooks_file = os.path.join(self.data_dir, "hooks.json")
            with open(hooks_file, 'w') as f:
                json.dump({k: v.to_dict() for k, v in self.hooks.items()}, f, indent=2)
        except Exception as e:
            print(f"Error saving plugin data: {e}")

    def _initialize_hooks(self):
        """Initialize system hooks"""
        if not self.hooks:
            default_hooks = [
                ("on_message_received", "message", "Triggered when message received"),
                ("on_file_downloaded", "download", "Triggered when file downloaded"),
                ("on_user_login", "auth", "Triggered on user login"),
                ("before_upload", "upload", "Before file upload"),
                ("after_upload", "upload", "After file upload"),
                ("on_search", "search", "When search is performed"),
                ("on_tag_added", "tagging", "When tag is added"),
                ("on_error", "system", "When error occurs")
            ]

            for hook_name, hook_type, description in default_hooks:
                hook_id = f"hook_{secrets.token_hex(4)}"
                self.hooks[hook_id] = ExtensionHook(
                    hook_id=hook_id,
                    hook_name=hook_name,
                    hook_type=hook_type,
                    description=description,
                    parameters=[],
                    registered_plugins=[],
                    execution_order=[],
                    created_at=datetime.now().isoformat()
                )
            self._save_data()

    def _log_event(self, plugin_id: str, event_type: str, user_id: str,
                   details: Dict, success: bool, error: Optional[str] = None):
        """Log plugin event"""
        event = PluginEvent(
            event_id=f"evt_{secrets.token_hex(8)}",
            plugin_id=plugin_id,
            event_type=event_type,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            details=details,
            success=success,
            error_message=error
        )
        self.events.append(event)

        # Keep only last 1000 events
        if len(self.events) > 1000:
            self.events = self.events[-1000:]

    # Plugin Management
    def install_plugin(self, manifest: Dict, user_id: str, config: Dict = None) -> Dict:
        """Install a plugin"""
        try:
            plugin_id = manifest.get('plugin_id')
            if not plugin_id:
                plugin_id = f"plugin_{secrets.token_hex(8)}"

            if plugin_id in self.plugins:
                return {"success": False, "error": "Plugin already installed"}

            now = datetime.now().isoformat()

            plugin = Plugin(
                plugin_id=plugin_id,
                manifest=manifest,
                status=PluginStatus.INACTIVE.value,
                installed_at=now,
                updated_at=now,
                installed_by=user_id,
                config=config or {},
                enabled=False,
                auto_update=True,
                install_count=0,
                rating=0.0,
                reviews_count=0,
                load_time_ms=0.0,
                memory_usage_mb=0.0,
                api_calls_count=0,
                errors_count=0,
                tags=manifest.get('tags', []),
                metadata={}
            )

            self.plugins[plugin_id] = plugin
            self._save_data()

            self._log_event(plugin_id, "install", user_id,
                          {"manifest": manifest}, True)

            return {
                "success": True,
                "plugin": plugin.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def uninstall_plugin(self, plugin_id: str, user_id: str) -> Dict:
        """Uninstall a plugin"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            # Disable first
            self.disable_plugin(plugin_id, user_id)

            # Remove from hooks
            for hook in self.hooks.values():
                if plugin_id in hook.registered_plugins:
                    hook.registered_plugins.remove(plugin_id)
                if plugin_id in hook.execution_order:
                    hook.execution_order.remove(plugin_id)

            del self.plugins[plugin_id]
            self._save_data()

            self._log_event(plugin_id, "uninstall", user_id, {}, True)

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def enable_plugin(self, plugin_id: str, user_id: str) -> Dict:
        """Enable a plugin"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            plugin = self.plugins[plugin_id]
            plugin.enabled = True
            plugin.status = PluginStatus.ACTIVE.value
            plugin.updated_at = datetime.now().isoformat()

            # Mock load time
            import random
            plugin.load_time_ms = round(random.uniform(10, 200), 2)

            self._save_data()

            self._log_event(plugin_id, "enable", user_id, {}, True)

            return {
                "success": True,
                "plugin": plugin.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def disable_plugin(self, plugin_id: str, user_id: str) -> Dict:
        """Disable a plugin"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            plugin = self.plugins[plugin_id]
            plugin.enabled = False
            plugin.status = PluginStatus.INACTIVE.value
            plugin.updated_at = datetime.now().isoformat()

            self._save_data()

            self._log_event(plugin_id, "disable", user_id, {}, True)

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_plugin(self, plugin_id: str, new_manifest: Dict, user_id: str) -> Dict:
        """Update a plugin"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            plugin = self.plugins[plugin_id]
            old_version = plugin.manifest.get('version', '0.0.0')
            new_version = new_manifest.get('version', '0.0.0')

            plugin.manifest = new_manifest
            plugin.status = PluginStatus.UPDATING.value
            plugin.updated_at = datetime.now().isoformat()

            self._save_data()

            # Re-enable if was active
            if plugin.enabled:
                plugin.status = PluginStatus.ACTIVE.value
                self._save_data()

            self._log_event(plugin_id, "update", user_id,
                          {"old_version": old_version, "new_version": new_version}, True)

            return {
                "success": True,
                "plugin": plugin.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def configure_plugin(self, plugin_id: str, config: Dict, user_id: str) -> Dict:
        """Configure a plugin"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            plugin = self.plugins[plugin_id]
            plugin.config.update(config)
            plugin.updated_at = datetime.now().isoformat()

            self._save_data()

            self._log_event(plugin_id, "configure", user_id,
                          {"config": config}, True)

            return {
                "success": True,
                "plugin": plugin.to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_plugin(self, plugin_id: str) -> Dict:
        """Get plugin details"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            return {
                "success": True,
                "plugin": self.plugins[plugin_id].to_dict()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_plugins(self, category: Optional[str] = None,
                    status: Optional[str] = None,
                    enabled: Optional[bool] = None) -> Dict:
        """List plugins with filters"""
        try:
            plugins = list(self.plugins.values())

            if category:
                plugins = [p for p in plugins
                          if p.manifest.get('category') == category]
            if status:
                plugins = [p for p in plugins if p.status == status]
            if enabled is not None:
                plugins = [p for p in plugins if p.enabled == enabled]

            return {
                "success": True,
                "plugins": [p.to_dict() for p in plugins],
                "count": len(plugins)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Hook Management
    def register_hook(self, plugin_id: str, hook_name: str, priority: int = 100) -> Dict:
        """Register plugin to a hook"""
        try:
            if plugin_id not in self.plugins:
                return {"success": False, "error": "Plugin not found"}

            # Find hook by name
            hook = None
            for h in self.hooks.values():
                if h.hook_name == hook_name:
                    hook = h
                    break

            if not hook:
                return {"success": False, "error": "Hook not found"}

            if plugin_id not in hook.registered_plugins:
                hook.registered_plugins.append(plugin_id)
                hook.execution_order.append(plugin_id)

                self._save_data()

            return {"success": True, "hook": hook.to_dict()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def unregister_hook(self, plugin_id: str, hook_name: str) -> Dict:
        """Unregister plugin from a hook"""
        try:
            hook = None
            for h in self.hooks.values():
                if h.hook_name == hook_name:
                    hook = h
                    break

            if not hook:
                return {"success": False, "error": "Hook not found"}

            if plugin_id in hook.registered_plugins:
                hook.registered_plugins.remove(plugin_id)
            if plugin_id in hook.execution_order:
                hook.execution_order.remove(plugin_id)

            self._save_data()

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_hooks(self) -> Dict:
        """List all available hooks"""
        try:
            return {
                "success": True,
                "hooks": [h.to_dict() for h in self.hooks.values()],
                "count": len(self.hooks)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def execute_hook(self, hook_name: str, data: Dict) -> Dict:
        """Execute a hook (mock implementation)"""
        try:
            hook = None
            for h in self.hooks.values():
                if h.hook_name == hook_name:
                    hook = h
                    break

            if not hook:
                return {"success": False, "error": "Hook not found"}

            results = []
            for plugin_id in hook.execution_order:
                if plugin_id in self.plugins:
                    plugin = self.plugins[plugin_id]
                    if plugin.enabled and plugin.status == PluginStatus.ACTIVE.value:
                        # Mock execution
                        plugin.api_calls_count += 1
                        results.append({
                            "plugin_id": plugin_id,
                            "plugin_name": plugin.manifest.get('name'),
                            "success": True,
                            "data": data
                        })

            self._save_data()

            return {
                "success": True,
                "hook_name": hook_name,
                "executed_plugins": len(results),
                "results": results
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Marketplace
    def browse_marketplace(self, category: Optional[str] = None,
                          featured: Optional[bool] = None,
                          query: Optional[str] = None) -> Dict:
        """Browse marketplace (mock data)"""
        try:
            # Create mock marketplace listings
            if not self.marketplace:
                self._create_mock_marketplace()

            listings = list(self.marketplace.values())

            if category:
                listings = [l for l in listings if l.category == category]
            if featured is not None:
                listings = [l for l in listings if l.featured == featured]
            if query:
                listings = [l for l in listings
                          if query.lower() in l.name.lower()
                          or query.lower() in l.description.lower()]

            return {
                "success": True,
                "listings": [l.to_dict() for l in listings],
                "count": len(listings)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _create_mock_marketplace(self):
        """Create mock marketplace listings"""
        mock_plugins = [
            ("Auto-Tagger Pro", "media", "Otomatik etiketleme ile dosyalarınızı organize edin", 9.99, False),
            ("Cloud Sync Plus", "integration", "Gelişmiş bulut senkronizasyon özellikleri", 14.99, False),
            ("Smart Search", "utility", "AI destekli akıllı arama", 0.0, True),
            ("Video Enhancer", "media", "Video kalitesini otomatik iyileştir", 19.99, False),
            ("Backup Master", "utility", "Otomatik yedekleme ve geri yükleme", 12.99, False),
            ("Theme Studio", "ui", "Özel temalar oluşturun", 0.0, True),
            ("Analytics Pro", "analytics", "Gelişmiş analitik ve raporlama", 24.99, False),
            ("Security Shield", "security", "Ek güvenlik özellikleri", 0.0, True)
        ]

        for name, category, desc, price, is_free in mock_plugins:
            listing_id = f"list_{secrets.token_hex(6)}"
            plugin_id = f"plugin_{secrets.token_hex(6)}"

            import random
            self.marketplace[listing_id] = PluginMarketplace(
                listing_id=listing_id,
                plugin_id=plugin_id,
                name=name,
                description=desc,
                version="1.0.0",
                author="Plugin Developer",
                category=category,
                price=price,
                is_free=is_free,
                license_type="MIT" if is_free else "Commercial",
                downloads=random.randint(100, 10000),
                rating=round(random.uniform(3.5, 5.0), 1),
                reviews_count=random.randint(10, 500),
                screenshots=[],
                video_url=None,
                tags=[category, "popular"],
                featured=is_free,
                verified=True,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )

    # Statistics
    def get_statistics(self) -> Dict:
        """Get plugin statistics"""
        try:
            total_plugins = len(self.plugins)
            active_plugins = sum(1 for p in self.plugins.values() if p.enabled)
            total_hooks = len(self.hooks)
            total_api_calls = sum(p.api_calls_count for p in self.plugins.values())
            total_errors = sum(p.errors_count for p in self.plugins.values())

            # Category distribution
            category_dist = {}
            for plugin in self.plugins.values():
                cat = plugin.manifest.get('category', 'custom')
                category_dist[cat] = category_dist.get(cat, 0) + 1

            # Status distribution
            status_dist = {}
            for plugin in self.plugins.values():
                status_dist[plugin.status] = status_dist.get(plugin.status, 0) + 1

            return {
                "success": True,
                "statistics": {
                    "total_plugins": total_plugins,
                    "active_plugins": active_plugins,
                    "inactive_plugins": total_plugins - active_plugins,
                    "total_hooks": total_hooks,
                    "total_api_calls": total_api_calls,
                    "total_errors": total_errors,
                    "category_distribution": category_dist,
                    "status_distribution": status_dist,
                    "marketplace_listings": len(self.marketplace)
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
plugin_manager = PluginManager()
