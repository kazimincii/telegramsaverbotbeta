"""
Biometric Authentication API Endpoints
Routes for biometric registration and authentication
"""

import logging
from pathlib import Path
from fastapi import HTTPException
from pydantic import BaseModel

try:
    from .biometric_auth import get_biometric_service
except ImportError:
    from biometric_auth import get_biometric_service

logger = logging.getLogger(__name__)


# Request Models
class RegistrationChallengeRequest(BaseModel):
    user_id: int
    user_name: str


class RegisterCredentialRequest(BaseModel):
    user_id: int
    user_name: str
    credential_id: str
    public_key: str
    authenticator_type: str
    challenge: str


class AuthenticationChallengeRequest(BaseModel):
    user_id: int = None  # Optional - if not provided, allow any credential


class VerifyAuthenticationRequest(BaseModel):
    credential_id: str
    challenge: str
    signature: str
    authenticator_data: str


class RemoveCredentialRequest(BaseModel):
    user_id: int
    credential_id: str


def register_biometric_routes(app):
    """Register all biometric authentication routes"""

    service = get_biometric_service()

    @app.post("/api/biometric/register/challenge")
    async def biometric_registration_challenge(request: RegistrationChallengeRequest):
        """
        Generate challenge for biometric credential registration

        Returns WebAuthn-compatible registration options
        """
        try:
            options = service.generate_registration_challenge(
                user_id=request.user_id,
                user_name=request.user_name
            )

            return {"ok": True, **options}
        except Exception as e:
            logger.error(f"Error generating registration challenge: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/biometric/register")
    async def biometric_register_credential(request: RegisterCredentialRequest):
        """
        Register a new biometric credential

        This endpoint is called after the user successfully completes
        biometric registration in their browser/device
        """
        try:
            result = service.register_credential(
                user_id=request.user_id,
                user_name=request.user_name,
                credential_id=request.credential_id,
                public_key=request.public_key,
                authenticator_type=request.authenticator_type,
                challenge=request.challenge
            )

            return {"ok": True, **result}
        except Exception as e:
            logger.error(f"Error registering credential: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/biometric/auth/challenge")
    async def biometric_authentication_challenge(request: AuthenticationChallengeRequest):
        """
        Generate challenge for biometric authentication

        Returns WebAuthn-compatible authentication options
        """
        try:
            options = service.generate_authentication_challenge(
                user_id=request.user_id
            )

            return {"ok": True, **options}
        except Exception as e:
            logger.error(f"Error generating authentication challenge: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/biometric/auth/verify")
    async def biometric_verify_authentication(request: VerifyAuthenticationRequest):
        """
        Verify biometric authentication

        This endpoint is called after the user successfully completes
        biometric authentication in their browser/device
        """
        try:
            result = service.verify_authentication(
                credential_id=request.credential_id,
                challenge=request.challenge,
                signature=request.signature,
                authenticator_data=request.authenticator_data
            )

            return {"ok": True, **result}
        except Exception as e:
            logger.error(f"Error verifying authentication: {e}")
            raise HTTPException(status_code=401, detail=str(e))

    @app.get("/api/biometric/credentials/{user_id}")
    async def biometric_get_credentials(user_id: int):
        """Get all biometric credentials for a user"""
        try:
            credentials = service.get_user_credentials(user_id)

            return {
                "ok": True,
                "credentials": credentials
            }
        except Exception as e:
            logger.error(f"Error getting credentials: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/api/biometric/credentials")
    async def biometric_remove_credential(request: RemoveCredentialRequest):
        """Remove a biometric credential"""
        try:
            result = service.remove_credential(
                user_id=request.user_id,
                credential_id=request.credential_id
            )

            return {"ok": True, **result}
        except Exception as e:
            logger.error(f"Error removing credential: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @app.get("/api/biometric/supported")
    async def biometric_check_support():
        """
        Check if biometric authentication is supported

        This endpoint helps the frontend determine if it should show
        biometric options
        """
        # In a real implementation, this would check server capabilities
        # For now, always return true
        return {
            "ok": True,
            "supported": True,
            "methods": {
                "fingerprint": True,
                "face_recognition": True,
                "platform_authenticator": True
            }
        }

    @app.post("/api/biometric/cleanup")
    async def biometric_cleanup():
        """
        Cleanup expired challenges (admin endpoint)

        This should be called periodically by a cron job
        """
        try:
            service.cleanup_expired_challenges()

            return {
                "ok": True,
                "message": "Cleanup completed"
            }
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    logger.info("Biometric authentication API routes registered")
