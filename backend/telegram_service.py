"""
Telegram Client Service
Handles Telegram login, session management, and data sync
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from telethon import TelegramClient, types as tl_types, functions, errors
from telethon.sessions import StringSession

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages encrypted Telegram sessions"""

    def __init__(self, session_file: Path):
        self.session_file = session_file
        self.encryption_key = self._get_encryption_key()

    def _get_encryption_key(self) -> bytes:
        """Get or create encryption key for sessions"""
        key_file = self.session_file.parent / ".session_key"

        if key_file.exists():
            return key_file.read_bytes()
        else:
            # Generate new key
            key = Fernet.generate_key()
            key_file.write_bytes(key)
            # Set restrictive permissions
            os.chmod(key_file, 0o600)
            return key

    def save_session(self, session_string: str) -> None:
        """Save encrypted session to disk"""
        fernet = Fernet(self.encryption_key)
        encrypted = fernet.encrypt(session_string.encode())
        self.session_file.write_bytes(encrypted)
        os.chmod(self.session_file, 0o600)
        logger.info("Session saved and encrypted")

    def load_session(self) -> Optional[str]:
        """Load and decrypt session from disk"""
        if not self.session_file.exists():
            return None

        try:
            fernet = Fernet(self.encryption_key)
            encrypted = self.session_file.read_bytes()
            decrypted = fernet.decrypt(encrypted)
            logger.info("Session loaded and decrypted")
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return None

    def delete_session(self) -> None:
        """Delete session file"""
        if self.session_file.exists():
            self.session_file.unlink()
            logger.info("Session deleted")


class TelegramService:
    """Service for managing Telegram client operations"""

    def __init__(self, api_id: int, api_hash: str, session_dir: Path):
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_dir = session_dir
        self.session_dir.mkdir(exist_ok=True)

        self.session_manager = SessionManager(session_dir / "telegram.session")
        self.client: Optional[TelegramClient] = None
        self.phone_code_hash: Optional[str] = None
        self._user_info: Optional[Dict] = None

    async def initialize(self) -> bool:
        """Initialize Telegram client with existing session if available"""
        session_string = self.session_manager.load_session()

        if session_string:
            try:
                self.client = TelegramClient(
                    StringSession(session_string),
                    self.api_id,
                    self.api_hash
                )
                await self.client.connect()

                if await self.client.is_user_authorized():
                    logger.info("Telegram client initialized with existing session")
                    await self._load_user_info()
                    return True
                else:
                    logger.warning("Session exists but user not authorized")
                    await self.client.disconnect()
                    self.client = None
            except Exception as e:
                logger.error(f"Failed to initialize with saved session: {e}")
                self.client = None

        return False

    async def send_code(self, phone_number: str) -> Dict:
        """Send verification code to phone number"""
        try:
            if not self.client:
                self.client = TelegramClient(
                    StringSession(),
                    self.api_id,
                    self.api_hash
                )
                await self.client.connect()

            result = await self.client.send_code_request(phone_number)
            self.phone_code_hash = result.phone_code_hash

            logger.info(f"Verification code sent to {phone_number}")

            return {
                "success": True,
                "phone_code_hash": self.phone_code_hash,
                "message": "Verification code sent"
            }
        except errors.FloodWaitError as e:
            logger.error(f"Flood wait error: {e}")
            raise Exception(f"Too many attempts. Please wait {e.seconds} seconds.")
        except Exception as e:
            logger.error(f"Error sending code: {e}")
            raise Exception(f"Failed to send verification code: {str(e)}")

    async def sign_in(self, phone_number: str, code: str, phone_code_hash: str) -> Dict:
        """Sign in with verification code"""
        try:
            if not self.client:
                raise Exception("Client not initialized")

            try:
                await self.client.sign_in(
                    phone_number,
                    code,
                    phone_code_hash=phone_code_hash
                )
            except errors.SessionPasswordNeededError:
                logger.info("2FA required")
                return {
                    "success": False,
                    "requires_2fa": True,
                    "message": "Two-factor authentication required"
                }

            # Save session
            session_string = self.client.session.save()
            self.session_manager.save_session(session_string)

            await self._load_user_info()

            logger.info("User signed in successfully")

            return {
                "success": True,
                "logged_in": True,
                "user": self._user_info
            }
        except errors.PhoneCodeInvalidError:
            raise Exception("Invalid verification code")
        except errors.PhoneCodeExpiredError:
            raise Exception("Verification code expired")
        except Exception as e:
            logger.error(f"Error signing in: {e}")
            raise Exception(f"Sign in failed: {str(e)}")

    async def sign_in_2fa(self, password: str) -> Dict:
        """Sign in with 2FA password"""
        try:
            if not self.client:
                raise Exception("Client not initialized")

            await self.client.sign_in(password=password)

            # Save session
            session_string = self.client.session.save()
            self.session_manager.save_session(session_string)

            await self._load_user_info()

            logger.info("User signed in with 2FA successfully")

            return {
                "success": True,
                "logged_in": True,
                "user": self._user_info
            }
        except errors.PasswordHashInvalidError:
            raise Exception("Invalid 2FA password")
        except Exception as e:
            logger.error(f"Error signing in with 2FA: {e}")
            raise Exception(f"2FA sign in failed: {str(e)}")

    async def logout(self) -> Dict:
        """Logout and delete session"""
        try:
            if self.client and await self.client.is_user_authorized():
                await self.client.log_out()

            if self.client:
                await self.client.disconnect()

            self.session_manager.delete_session()
            self.client = None
            self._user_info = None

            logger.info("User logged out successfully")

            return {
                "success": True,
                "message": "Logged out successfully"
            }
        except Exception as e:
            logger.error(f"Error logging out: {e}")
            raise Exception(f"Logout failed: {str(e)}")

    async def get_status(self) -> Dict:
        """Get current login status"""
        if not self.client:
            await self.initialize()

        logged_in = False
        if self.client:
            try:
                logged_in = await self.client.is_user_authorized()
            except:
                logged_in = False

        return {
            "logged_in": logged_in,
            "user": self._user_info if logged_in else None
        }

    async def _load_user_info(self) -> None:
        """Load current user information"""
        if not self.client:
            return

        try:
            me = await self.client.get_me()
            self._user_info = {
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "phone": me.phone,
                "is_premium": me.premium if hasattr(me, 'premium') else False
            }
        except Exception as e:
            logger.error(f"Error loading user info: {e}")

    async def get_chats(self, limit: int = 100) -> List[Dict]:
        """Get user's chats/dialogs"""
        if not self.client or not await self.client.is_user_authorized():
            raise Exception("Not authenticated")

        try:
            dialogs = await self.client.get_dialogs(limit=limit)

            chats = []
            for dialog in dialogs:
                chat_data = {
                    "id": dialog.id,
                    "title": dialog.title,
                    "is_group": dialog.is_group,
                    "is_channel": dialog.is_channel,
                    "unread_count": dialog.unread_count,
                }

                if dialog.message:
                    chat_data["last_message"] = {
                        "text": dialog.message.text or "",
                        "date": dialog.message.date.timestamp() if dialog.message.date else None
                    }

                if hasattr(dialog.entity, 'participants_count'):
                    chat_data["participants_count"] = dialog.entity.participants_count

                chats.append(chat_data)

            logger.info(f"Retrieved {len(chats)} chats")
            return chats
        except Exception as e:
            logger.error(f"Error getting chats: {e}")
            raise Exception(f"Failed to get chats: {str(e)}")

    async def get_messages(self, chat_id: int, limit: int = 100) -> List[Dict]:
        """Get messages from a chat"""
        if not self.client or not await self.client.is_user_authorized():
            raise Exception("Not authenticated")

        try:
            messages = await self.client.get_messages(chat_id, limit=limit)

            result = []
            for msg in messages:
                if not msg:
                    continue

                msg_data = {
                    "id": msg.id,
                    "text": msg.text or "",
                    "date": msg.date.timestamp() if msg.date else None,
                    "is_outgoing": msg.out,
                    "sender_id": msg.sender_id,
                }

                # Get sender name
                if msg.sender:
                    if hasattr(msg.sender, 'first_name'):
                        msg_data["sender_name"] = f"{msg.sender.first_name or ''} {msg.sender.last_name or ''}".strip()
                    elif hasattr(msg.sender, 'title'):
                        msg_data["sender_name"] = msg.sender.title

                # Media type
                if msg.media:
                    if isinstance(msg.media, tl_types.MessageMediaPhoto):
                        msg_data["media_type"] = "photo"
                    elif isinstance(msg.media, tl_types.MessageMediaDocument):
                        if msg.video:
                            msg_data["media_type"] = "video"
                        else:
                            msg_data["media_type"] = "document"

                result.append(msg_data)

            logger.info(f"Retrieved {len(result)} messages from chat {chat_id}")
            return result
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            raise Exception(f"Failed to get messages: {str(e)}")

    async def get_contacts(self) -> List[Dict]:
        """Get user's contacts"""
        if not self.client or not await self.client.is_user_authorized():
            raise Exception("Not authenticated")

        try:
            contacts = await self.client.get_contacts()

            result = []
            for contact in contacts:
                contact_data = {
                    "id": contact.id,
                    "name": f"{contact.first_name or ''} {contact.last_name or ''}".strip(),
                    "username": contact.username,
                    "phone": contact.phone,
                    # Placeholder for AI data - will be populated by AI service
                    "ai_profession": None,
                    "ai_sector": None,
                    "confidence": 0.0,
                    "evidence_keywords": []
                }
                result.append(contact_data)

            logger.info(f"Retrieved {len(result)} contacts")
            return result
        except Exception as e:
            logger.error(f"Error getting contacts: {e}")
            raise Exception(f"Failed to get contacts: {str(e)}")
