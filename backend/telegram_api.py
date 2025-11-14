"""
Telegram API Endpoints
Routes for Telegram client login, session management, and data retrieval
"""

import logging
import os
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
from pydantic import BaseModel

try:
    from .telegram_service import TelegramService
except ImportError:
    from telegram_service import TelegramService

logger = logging.getLogger(__name__)

# Global telegram service instance
telegram_service: Optional[TelegramService] = None


def get_telegram_service() -> TelegramService:
    """Get or create telegram service instance"""
    global telegram_service

    if telegram_service is None:
        # Get API credentials from environment or config
        api_id = int(os.getenv("TELEGRAM_API_ID", "0"))
        api_hash = os.getenv("TELEGRAM_API_HASH", "")
        linkedin_api_key = os.getenv("LINKEDIN_API_KEY")  # Optional

        if not api_id or not api_hash:
            raise Exception("Telegram API credentials not configured")

        session_dir = Path(__file__).parent / ".telegram_sessions"
        telegram_service = TelegramService(api_id, api_hash, session_dir, linkedin_api_key)

    return telegram_service


# Request Models
class SendCodeRequest(BaseModel):
    phone_number: str


class SignInRequest(BaseModel):
    phone_number: str
    code: str
    phone_code_hash: str


class SignIn2FARequest(BaseModel):
    password: str


def register_telegram_routes(app):
    """Register all telegram routes to the FastAPI app"""

    @app.get("/api/telegram/status")
    async def telegram_status():
        """Get Telegram login status"""
        try:
            service = get_telegram_service()
            status = await service.get_status()
            return {"ok": True, **status}
        except Exception as e:
            logger.error(f"Error getting status: {e}")
            return {"ok": False, "logged_in": False, "error": str(e)}

    @app.post("/api/telegram/send-code")
    async def telegram_send_code(request: SendCodeRequest):
        """Send verification code to phone number"""
        try:
            service = get_telegram_service()
            result = await service.send_code(request.phone_number)
            return {"ok": True, **result}
        except Exception as e:
            logger.error(f"Error sending code: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/telegram/sign-in")
    async def telegram_sign_in(request: SignInRequest):
        """Sign in with verification code"""
        try:
            service = get_telegram_service()
            result = await service.sign_in(
                request.phone_number,
                request.code,
                request.phone_code_hash
            )

            if result.get("requires_2fa"):
                raise HTTPException(
                    status_code=403,
                    detail="Two-factor authentication required"
                )

            return {"ok": True, **result}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error signing in: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/telegram/sign-in-2fa")
    async def telegram_sign_in_2fa(request: SignIn2FARequest):
        """Sign in with 2FA password"""
        try:
            service = get_telegram_service()
            result = await service.sign_in_2fa(request.password)
            return {"ok": True, **result}
        except Exception as e:
            logger.error(f"Error signing in with 2FA: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/telegram/logout")
    async def telegram_logout():
        """Logout from Telegram"""
        try:
            service = get_telegram_service()
            result = await service.logout()
            return {"ok": True, **result}
        except Exception as e:
            logger.error(f"Error logging out: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/telegram/chats")
    async def telegram_get_chats(limit: int = 100):
        """Get user's chats/dialogs"""
        try:
            service = get_telegram_service()
            chats = await service.get_chats(limit=limit)
            return {"ok": True, "chats": chats}
        except Exception as e:
            logger.error(f"Error getting chats: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/telegram/messages/{chat_id}")
    async def telegram_get_messages(chat_id: int, limit: int = 100):
        """Get messages from a chat"""
        try:
            service = get_telegram_service()
            messages = await service.get_messages(chat_id, limit=limit)
            return {"ok": True, "messages": messages}
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/telegram/contacts")
    async def telegram_get_contacts(analyze_with_ai: bool = True, ai_limit: int = 50):
        """Get user's contacts with AI profiles

        Args:
            analyze_with_ai: Whether to run AI analysis on contacts (default: True)
            ai_limit: Number of messages to analyze per contact (default: 50)
        """
        try:
            service = get_telegram_service()
            contacts = await service.get_contacts(
                analyze_with_ai=analyze_with_ai,
                ai_limit=ai_limit
            )

            return {"ok": True, "contacts": contacts}
        except Exception as e:
            logger.error(f"Error getting contacts: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/telegram/contact/{contact_id}")
    async def telegram_get_contact(contact_id: int, ai_limit: int = 100):
        """Get detailed contact information with AI profile

        Args:
            contact_id: Contact ID
            ai_limit: Number of messages to analyze (default: 100)
        """
        try:
            service = get_telegram_service()

            # Get all contacts with AI analysis
            contacts = await service.get_contacts(analyze_with_ai=True, ai_limit=ai_limit)

            # Find contact by ID
            contact = next((c for c in contacts if c["id"] == contact_id), None)

            if not contact:
                raise HTTPException(status_code=404, detail="Contact not found")

            return {"ok": True, **contact}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting contact: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.put("/api/telegram/contact/{contact_id}")
    async def telegram_update_contact(contact_id: int, payload: dict):
        """Update contact AI profile (manual override)"""
        try:
            # TODO: Store manual overrides in database
            # For now, just return updated data

            updated_contact = {
                "id": contact_id,
                "ai_profession": payload.get("ai_profession"),
                "ai_sector": payload.get("ai_sector"),
                "confidence": 1.0,  # Manual override = 100% confidence
                "evidence_keywords": [],
                "manual_override": True
            }

            logger.info(f"Contact {contact_id} profile updated manually")

            return {"ok": True, **updated_contact}
        except Exception as e:
            logger.error(f"Error updating contact: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/telegram/start-sync")
    async def telegram_start_sync():
        """Start syncing Telegram data"""
        try:
            service = get_telegram_service()

            # Check if logged in
            status = await service.get_status()
            if not status.get("logged_in"):
                raise HTTPException(status_code=401, detail="Not logged in")

            # TODO: Trigger background sync task
            # For now, just return success

            logger.info("Telegram sync started")

            return {
                "ok": True,
                "message": "Sync started",
                "status": "syncing"
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error starting sync: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    logger.info("Telegram API routes registered")
