"""
Webhook Manager - Trigger external URLs on events
Supports Zapier, Make.com, and custom webhooks
"""
import logging
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional

try:  # pragma: no cover - simple import guard
    import aiohttp
except ModuleNotFoundError:  # pragma: no cover - handled at runtime
    aiohttp = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class WebhookManager:
    """Manage webhook subscriptions and delivery."""

    def __init__(self, config_file: Path):
        self.config_file = config_file
        self.webhooks: List[Dict] = []
        self._load_webhooks()

    def _load_webhooks(self):
        """Load webhook configurations."""
        if self.config_file.exists():
            try:
                data = json.loads(self.config_file.read_text("utf-8"))
                self.webhooks = data.get("webhooks", [])
                logger.info(f"Loaded {len(self.webhooks)} webhooks")
            except Exception as e:
                logger.error(f"Failed to load webhooks: {e}")

    def _save_webhooks(self):
        """Save webhook configurations."""
        try:
            data = {"webhooks": self.webhooks}
            self.config_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to save webhooks: {e}")

    def add_webhook(self, url: str, events: List[str], name: str = "Unnamed") -> Dict:
        """Add a new webhook subscription."""
        webhook = {
            "id": f"wh_{len(self.webhooks) + 1}",
            "name": name,
            "url": url,
            "events": events,  # ["download.completed", "scan.finished", etc.]
            "enabled": True
        }
        self.webhooks.append(webhook)
        self._save_webhooks()
        logger.info(f"Added webhook: {name} for events: {events}")
        return webhook

    def remove_webhook(self, webhook_id: str) -> bool:
        """Remove a webhook."""
        self.webhooks = [w for w in self.webhooks if w["id"] != webhook_id]
        self._save_webhooks()
        return True

    async def trigger_event(self, event: str, data: Dict[str, Any]):
        """Trigger all webhooks subscribed to this event."""
        matching = [w for w in self.webhooks if w["enabled"] and event in w["events"]]

        if not matching:
            return

        logger.info(f"Triggering {len(matching)} webhooks for event: {event}")

        tasks = []
        for webhook in matching:
            tasks.append(self._send_webhook(webhook, event, data))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_webhook(self, webhook: Dict, event: str, data: Dict):
        """Send webhook HTTP POST request."""
        if aiohttp is None:
            logger.warning(
                "aiohttp is not installed; skipping webhook '%s' delivery",
                webhook.get("name", webhook.get("id", "unknown")),
            )
            return

        try:
            payload = {
                "event": event,
                "timestamp": data.get("timestamp"),
                "data": data
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook["url"],
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Webhook {webhook['name']} delivered successfully")
                    else:
                        logger.warning(f"Webhook {webhook['name']} returned {response.status}")

        except asyncio.TimeoutError:
            logger.error(f"Webhook {webhook['name']} timed out")
        except Exception as e:
            logger.error(f"Webhook {webhook['name']} failed: {e}")


# Supported events:
WEBHOOK_EVENTS = [
    "download.started",      # Download session started
    "download.completed",    # File downloaded
    "download.finished",     # All downloads finished
    "scan.completed",        # Duplicate scan completed
    "classification.done",   # AI classification finished
    "sync.completed",        # Cloud sync finished
]
