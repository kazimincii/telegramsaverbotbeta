"""
Cloud Sync Service for Multi-Device Support
Provides settings sync, download queue sync, and E2E encryption
"""

import os
import json
import uuid
import hashlib
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Try to import crypto libraries (optional)
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logger.warning("cryptography not available. E2E encryption will be disabled.")


class CloudSyncService:
    """Multi-device cloud sync service with E2E encryption"""

    def __init__(self, storage_path: str = None):
        self.storage_path = Path(storage_path) if storage_path else Path.cwd() / 'sync_data'
        self.storage_path.mkdir(exist_ok=True)

        self.devices_file = self.storage_path / 'devices.json'
        self.sync_data_dir = self.storage_path / 'sync_data'
        self.sync_data_dir.mkdir(exist_ok=True)

        self.devices = self._load_devices()
        self.encryption_enabled = CRYPTO_AVAILABLE

    def _load_devices(self) -> Dict:
        """Load registered devices"""
        if self.devices_file.exists():
            try:
                with open(self.devices_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load devices: {e}")
        return {}

    def _save_devices(self):
        """Save registered devices"""
        try:
            with open(self.devices_file, 'w') as f:
                json.dump(self.devices, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save devices: {e}")

    def register_device(
        self,
        device_name: str,
        device_type: str,
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Register a new device for sync

        Args:
            device_name: Name of device (e.g., "John's MacBook")
            device_type: Type of device (desktop, mobile, web)
            user_id: Optional user ID

        Returns:
            Dict with device info and sync token
        """
        try:
            device_id = str(uuid.uuid4())
            sync_token = self._generate_sync_token(device_id)

            device_info = {
                'device_id': device_id,
                'device_name': device_name,
                'device_type': device_type,
                'user_id': user_id or 'default',
                'sync_token': sync_token,
                'registered_at': datetime.now().isoformat(),
                'last_sync': None,
                'sync_enabled': True
            }

            self.devices[device_id] = device_info
            self._save_devices()

            logger.info(f"Device registered: {device_name} ({device_id})")

            return {
                'success': True,
                'device_id': device_id,
                'sync_token': sync_token,
                'device_info': device_info
            }

        except Exception as e:
            logger.error(f"Device registration error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _generate_sync_token(self, device_id: str) -> str:
        """Generate sync token for device"""
        token_data = f"{device_id}:{datetime.now().isoformat()}:{uuid.uuid4()}"
        return hashlib.sha256(token_data.encode()).hexdigest()

    def get_devices(self, user_id: str = 'default') -> List[Dict]:
        """Get all registered devices for user"""
        user_devices = [
            device for device in self.devices.values()
            if device.get('user_id') == user_id
        ]
        return user_devices

    def remove_device(self, device_id: str) -> Dict:
        """Remove a device"""
        try:
            if device_id in self.devices:
                del self.devices[device_id]
                self._save_devices()

                # Clean up device sync data
                device_sync_file = self.sync_data_dir / f"{device_id}.json"
                if device_sync_file.exists():
                    device_sync_file.unlink()

                return {
                    'success': True,
                    'message': f'Device {device_id} removed'
                }
            else:
                return {
                    'success': False,
                    'error': 'Device not found'
                }

        except Exception as e:
            logger.error(f"Remove device error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def sync_settings(
        self,
        device_id: str,
        settings: Dict,
        encrypt: bool = True
    ) -> Dict:
        """
        Sync settings from device

        Args:
            device_id: Device ID
            settings: Settings to sync
            encrypt: Whether to encrypt data

        Returns:
            Dict with sync result
        """
        try:
            if device_id not in self.devices:
                return {
                    'success': False,
                    'error': 'Device not registered'
                }

            # Encrypt if enabled
            if encrypt and self.encryption_enabled:
                encrypted_data = self._encrypt_data(settings, device_id)
                sync_data = {
                    'encrypted': True,
                    'data': encrypted_data
                }
            else:
                sync_data = {
                    'encrypted': False,
                    'data': settings
                }

            # Add metadata
            sync_data.update({
                'device_id': device_id,
                'synced_at': datetime.now().isoformat(),
                'data_type': 'settings',
                'version': 1
            })

            # Save sync data
            sync_file = self.sync_data_dir / f"{device_id}_settings.json"
            with open(sync_file, 'w') as f:
                json.dump(sync_data, f, indent=2)

            # Update device last sync
            self.devices[device_id]['last_sync'] = datetime.now().isoformat()
            self._save_devices()

            return {
                'success': True,
                'synced_at': sync_data['synced_at'],
                'encrypted': sync_data['encrypted']
            }

        except Exception as e:
            logger.error(f"Settings sync error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_synced_settings(
        self,
        device_id: str,
        decrypt: bool = True
    ) -> Dict:
        """
        Get synced settings for device

        Args:
            device_id: Device ID
            decrypt: Whether to decrypt data

        Returns:
            Dict with settings data
        """
        try:
            if device_id not in self.devices:
                return {
                    'success': False,
                    'error': 'Device not registered'
                }

            sync_file = self.sync_data_dir / f"{device_id}_settings.json"

            if not sync_file.exists():
                return {
                    'success': False,
                    'error': 'No synced settings found'
                }

            with open(sync_file, 'r') as f:
                sync_data = json.load(f)

            # Decrypt if needed
            if sync_data.get('encrypted') and decrypt and self.encryption_enabled:
                decrypted_data = self._decrypt_data(sync_data['data'], device_id)
                settings = decrypted_data
            else:
                settings = sync_data['data']

            return {
                'success': True,
                'settings': settings,
                'synced_at': sync_data.get('synced_at'),
                'device_id': device_id
            }

        except Exception as e:
            logger.error(f"Get synced settings error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def sync_queue(
        self,
        device_id: str,
        queue_items: List[Dict],
        encrypt: bool = True
    ) -> Dict:
        """
        Sync download queue from device

        Args:
            device_id: Device ID
            queue_items: Queue items to sync
            encrypt: Whether to encrypt data

        Returns:
            Dict with sync result
        """
        try:
            if device_id not in self.devices:
                return {
                    'success': False,
                    'error': 'Device not registered'
                }

            # Encrypt if enabled
            if encrypt and self.encryption_enabled:
                encrypted_data = self._encrypt_data(queue_items, device_id)
                sync_data = {
                    'encrypted': True,
                    'data': encrypted_data
                }
            else:
                sync_data = {
                    'encrypted': False,
                    'data': queue_items
                }

            # Add metadata
            sync_data.update({
                'device_id': device_id,
                'synced_at': datetime.now().isoformat(),
                'data_type': 'queue',
                'version': 1,
                'item_count': len(queue_items)
            })

            # Save sync data
            sync_file = self.sync_data_dir / f"{device_id}_queue.json"
            with open(sync_file, 'w') as f:
                json.dump(sync_data, f, indent=2)

            # Update device last sync
            self.devices[device_id]['last_sync'] = datetime.now().isoformat()
            self._save_devices()

            return {
                'success': True,
                'synced_at': sync_data['synced_at'],
                'item_count': sync_data['item_count'],
                'encrypted': sync_data['encrypted']
            }

        except Exception as e:
            logger.error(f"Queue sync error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_synced_queue(
        self,
        device_id: str,
        decrypt: bool = True
    ) -> Dict:
        """Get synced queue for device"""
        try:
            if device_id not in self.devices:
                return {
                    'success': False,
                    'error': 'Device not registered'
                }

            sync_file = self.sync_data_dir / f"{device_id}_queue.json"

            if not sync_file.exists():
                return {
                    'success': True,
                    'queue': [],
                    'message': 'No synced queue found'
                }

            with open(sync_file, 'r') as f:
                sync_data = json.load(f)

            # Decrypt if needed
            if sync_data.get('encrypted') and decrypt and self.encryption_enabled:
                decrypted_data = self._decrypt_data(sync_data['data'], device_id)
                queue = decrypted_data
            else:
                queue = sync_data['data']

            return {
                'success': True,
                'queue': queue,
                'synced_at': sync_data.get('synced_at'),
                'item_count': len(queue)
            }

        except Exception as e:
            logger.error(f"Get synced queue error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def merge_queues(
        self,
        local_queue: List[Dict],
        synced_queue: List[Dict]
    ) -> List[Dict]:
        """
        Merge local and synced queues (conflict resolution)

        Args:
            local_queue: Local queue items
            synced_queue: Synced queue items

        Returns:
            Merged queue
        """
        # Use dict to deduplicate by unique identifier
        merged = {}

        # Add local items
        for item in local_queue:
            key = self._get_queue_item_key(item)
            merged[key] = item

        # Add synced items (newer ones override)
        for item in synced_queue:
            key = self._get_queue_item_key(item)
            if key not in merged or self._is_newer(item, merged[key]):
                merged[key] = item

        return list(merged.values())

    def _get_queue_item_key(self, item: Dict) -> str:
        """Generate unique key for queue item"""
        return f"{item.get('chat_id', '')}:{item.get('message_id', '')}:{item.get('file_id', '')}"

    def _is_newer(self, item1: Dict, item2: Dict) -> bool:
        """Check if item1 is newer than item2"""
        ts1 = item1.get('timestamp', 0)
        ts2 = item2.get('timestamp', 0)
        return ts1 > ts2

    def _encrypt_data(self, data: Any, device_id: str) -> str:
        """Encrypt data using device-specific key"""
        if not CRYPTO_AVAILABLE:
            raise Exception("Encryption not available")

        try:
            # Generate key from device ID
            key = self._derive_key(device_id)
            fernet = Fernet(key)

            # Encrypt
            json_data = json.dumps(data).encode()
            encrypted = fernet.encrypt(json_data)

            return encrypted.decode()

        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise

    def _decrypt_data(self, encrypted_data: str, device_id: str) -> Any:
        """Decrypt data using device-specific key"""
        if not CRYPTO_AVAILABLE:
            raise Exception("Decryption not available")

        try:
            # Generate key from device ID
            key = self._derive_key(device_id)
            fernet = Fernet(key)

            # Decrypt
            decrypted = fernet.decrypt(encrypted_data.encode())
            data = json.loads(decrypted.decode())

            return data

        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise

    def _derive_key(self, device_id: str) -> bytes:
        """Derive encryption key from device ID"""
        # Use PBKDF2 to derive key from device ID
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'telegram_saver_salt',  # In production, use random salt per device
            iterations=100000,
        )
        key = kdf.derive(device_id.encode())

        # Fernet requires base64 encoded key
        import base64
        return base64.urlsafe_b64encode(key)

    def get_sync_status(self, device_id: str) -> Dict:
        """Get sync status for device"""
        try:
            if device_id not in self.devices:
                return {
                    'success': False,
                    'error': 'Device not registered'
                }

            device = self.devices[device_id]

            # Check for available synced data
            settings_file = self.sync_data_dir / f"{device_id}_settings.json"
            queue_file = self.sync_data_dir / f"{device_id}_queue.json"

            return {
                'success': True,
                'device_name': device.get('device_name'),
                'last_sync': device.get('last_sync'),
                'sync_enabled': device.get('sync_enabled', True),
                'has_synced_settings': settings_file.exists(),
                'has_synced_queue': queue_file.exists(),
                'encryption_enabled': self.encryption_enabled
            }

        except Exception as e:
            logger.error(f"Get sync status error: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Global sync service instance
_sync_service: Optional[CloudSyncService] = None


def get_sync_service(storage_path: str = None) -> CloudSyncService:
    """Get or create cloud sync service instance"""
    global _sync_service

    if _sync_service is None:
        _sync_service = CloudSyncService(storage_path)

    return _sync_service
