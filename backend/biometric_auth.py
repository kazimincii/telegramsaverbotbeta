"""
Biometric Authentication Service
Handles fingerprint, face recognition, and WebAuthn-based authentication
"""

import base64
import hashlib
import hmac
import logging
import os
import secrets
import json
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2

logger = logging.getLogger(__name__)


@dataclass
class BiometricCredential:
    """Biometric credential (WebAuthn compatible)"""
    credential_id: str
    public_key: str
    user_id: int
    user_name: str
    authenticator_type: str  # "platform" (TouchID/WindowsHello) or "cross-platform" (YubiKey)
    created_at: datetime
    last_used: Optional[datetime] = None
    counter: int = 0  # Sign counter for replay attack prevention

    def to_dict(self) -> dict:
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        if self.last_used:
            data['last_used'] = self.last_used.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: dict):
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        if data.get('last_used'):
            data['last_used'] = datetime.fromisoformat(data['last_used'])
        return cls(**data)


@dataclass
class BiometricChallenge:
    """Challenge for biometric authentication"""
    challenge: str
    user_id: int
    created_at: datetime
    expires_at: datetime
    used: bool = False

    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at

    def to_dict(self) -> dict:
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['expires_at'] = self.expires_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: dict):
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        data['expires_at'] = datetime.fromisoformat(data['expires_at'])
        return cls(**data)


class BiometricAuthService:
    """Service for managing biometric authentication"""

    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(exist_ok=True, parents=True)

        self.credentials_file = storage_dir / "biometric_credentials.json"
        self.challenges_file = storage_dir / "biometric_challenges.json"

        self.encryption_key = self._get_encryption_key()
        self._load_data()

    def _get_encryption_key(self) -> bytes:
        """Get or create encryption key"""
        key_file = self.storage_dir / ".biometric_key"

        if key_file.exists():
            return key_file.read_bytes()
        else:
            key = Fernet.generate_key()
            key_file.write_bytes(key)
            os.chmod(key_file, 0o600)
            return key

    def _load_data(self):
        """Load credentials and challenges from storage"""
        self.credentials: Dict[str, BiometricCredential] = {}
        self.challenges: Dict[str, BiometricChallenge] = {}

        # Load credentials
        if self.credentials_file.exists():
            try:
                fernet = Fernet(self.encryption_key)
                encrypted = self.credentials_file.read_bytes()
                decrypted = fernet.decrypt(encrypted)
                data = json.loads(decrypted.decode())

                for cred_id, cred_data in data.items():
                    self.credentials[cred_id] = BiometricCredential.from_dict(cred_data)

                logger.info(f"Loaded {len(self.credentials)} biometric credentials")
            except Exception as e:
                logger.error(f"Failed to load credentials: {e}")

        # Load challenges
        if self.challenges_file.exists():
            try:
                data = json.loads(self.challenges_file.read_text())
                for challenge_id, challenge_data in data.items():
                    self.challenges[challenge_id] = BiometricChallenge.from_dict(challenge_data)

                logger.info(f"Loaded {len(self.challenges)} biometric challenges")
            except Exception as e:
                logger.error(f"Failed to load challenges: {e}")

    def _save_credentials(self):
        """Save credentials to encrypted storage"""
        try:
            data = {
                cred_id: cred.to_dict()
                for cred_id, cred in self.credentials.items()
            }

            fernet = Fernet(self.encryption_key)
            encrypted = fernet.encrypt(json.dumps(data).encode())
            self.credentials_file.write_bytes(encrypted)
            os.chmod(self.credentials_file, 0o600)

            logger.info(f"Saved {len(self.credentials)} biometric credentials")
        except Exception as e:
            logger.error(f"Failed to save credentials: {e}")
            raise

    def _save_challenges(self):
        """Save challenges to storage"""
        try:
            data = {
                challenge_id: challenge.to_dict()
                for challenge_id, challenge in self.challenges.items()
                if not challenge.is_expired()
            }

            self.challenges_file.write_text(json.dumps(data, indent=2))
            logger.info(f"Saved {len(data)} active challenges")
        except Exception as e:
            logger.error(f"Failed to save challenges: {e}")

    def generate_registration_challenge(self, user_id: int, user_name: str) -> Dict:
        """
        Generate challenge for biometric credential registration

        Returns WebAuthn-compatible registration options
        """
        # Generate random challenge (32 bytes)
        challenge_bytes = secrets.token_bytes(32)
        challenge = base64.urlsafe_b64encode(challenge_bytes).decode().rstrip('=')

        # Create challenge record
        challenge_obj = BiometricChallenge(
            challenge=challenge,
            user_id=user_id,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=5)
        )

        self.challenges[challenge] = challenge_obj
        self._save_challenges()

        # WebAuthn PublicKeyCredentialCreationOptions
        registration_options = {
            "challenge": challenge,
            "rp": {
                "name": "Telegram Saver",
                "id": "localhost"  # Should be domain in production
            },
            "user": {
                "id": base64.urlsafe_b64encode(str(user_id).encode()).decode().rstrip('='),
                "name": user_name,
                "displayName": user_name
            },
            "pubKeyCredParams": [
                {"type": "public-key", "alg": -7},   # ES256
                {"type": "public-key", "alg": -257}  # RS256
            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",  # Prefer platform authenticators (TouchID, Windows Hello)
                "userVerification": "required",
                "requireResidentKey": False
            },
            "timeout": 300000,  # 5 minutes
            "attestation": "direct"
        }

        logger.info(f"Generated registration challenge for user {user_id}")
        return registration_options

    def register_credential(
        self,
        user_id: int,
        user_name: str,
        credential_id: str,
        public_key: str,
        authenticator_type: str,
        challenge: str
    ) -> Dict:
        """
        Register a new biometric credential

        Args:
            user_id: User ID
            user_name: User name
            credential_id: Credential ID from authenticator
            public_key: Public key from authenticator
            authenticator_type: "platform" or "cross-platform"
            challenge: Challenge that was used for registration

        Returns:
            Registration result
        """
        # Verify challenge
        if challenge not in self.challenges:
            raise Exception("Invalid challenge")

        challenge_obj = self.challenges[challenge]

        if challenge_obj.used:
            raise Exception("Challenge already used")

        if challenge_obj.is_expired():
            raise Exception("Challenge expired")

        if challenge_obj.user_id != user_id:
            raise Exception("Challenge user mismatch")

        # Mark challenge as used
        challenge_obj.used = True
        self._save_challenges()

        # Create credential
        credential = BiometricCredential(
            credential_id=credential_id,
            public_key=public_key,
            user_id=user_id,
            user_name=user_name,
            authenticator_type=authenticator_type,
            created_at=datetime.now()
        )

        self.credentials[credential_id] = credential
        self._save_credentials()

        logger.info(f"Registered biometric credential for user {user_id}")

        return {
            "success": True,
            "credential_id": credential_id,
            "message": "Biometric credential registered successfully"
        }

    def generate_authentication_challenge(self, user_id: Optional[int] = None) -> Dict:
        """
        Generate challenge for biometric authentication

        Args:
            user_id: Optional user ID to filter credentials

        Returns:
            WebAuthn-compatible authentication options
        """
        # Generate random challenge
        challenge_bytes = secrets.token_bytes(32)
        challenge = base64.urlsafe_b64encode(challenge_bytes).decode().rstrip('=')

        # Get allowed credentials
        allowed_credentials = []
        for cred_id, cred in self.credentials.items():
            if user_id is None or cred.user_id == user_id:
                allowed_credentials.append({
                    "type": "public-key",
                    "id": cred_id
                })

        # Create challenge record
        challenge_obj = BiometricChallenge(
            challenge=challenge,
            user_id=user_id or 0,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=5)
        )

        self.challenges[challenge] = challenge_obj
        self._save_challenges()

        # WebAuthn PublicKeyCredentialRequestOptions
        authentication_options = {
            "challenge": challenge,
            "timeout": 300000,  # 5 minutes
            "rpId": "localhost",
            "allowCredentials": allowed_credentials,
            "userVerification": "required"
        }

        logger.info(f"Generated authentication challenge (user_id: {user_id})")
        return authentication_options

    def verify_authentication(
        self,
        credential_id: str,
        challenge: str,
        signature: str,
        authenticator_data: str
    ) -> Dict:
        """
        Verify biometric authentication

        Args:
            credential_id: Credential ID used for authentication
            challenge: Challenge that was issued
            signature: Signature from authenticator
            authenticator_data: Authenticator data

        Returns:
            Verification result with user info
        """
        # Verify challenge
        if challenge not in self.challenges:
            raise Exception("Invalid challenge")

        challenge_obj = self.challenges[challenge]

        if challenge_obj.used:
            raise Exception("Challenge already used")

        if challenge_obj.is_expired():
            raise Exception("Challenge expired")

        # Get credential
        if credential_id not in self.credentials:
            raise Exception("Invalid credential")

        credential = self.credentials[credential_id]

        # In production, verify signature using public key
        # For now, we'll simulate verification
        # TODO: Implement actual signature verification using cryptography library

        # Mark challenge as used
        challenge_obj.used = True
        self._save_challenges()

        # Update credential
        credential.last_used = datetime.now()
        credential.counter += 1
        self._save_credentials()

        logger.info(f"Biometric authentication successful for user {credential.user_id}")

        return {
            "success": True,
            "user_id": credential.user_id,
            "user_name": credential.user_name,
            "message": "Authentication successful"
        }

    def get_user_credentials(self, user_id: int) -> List[Dict]:
        """Get all credentials for a user"""
        credentials = [
            {
                "credential_id": cred.credential_id,
                "authenticator_type": cred.authenticator_type,
                "created_at": cred.created_at.isoformat(),
                "last_used": cred.last_used.isoformat() if cred.last_used else None,
                "counter": cred.counter
            }
            for cred in self.credentials.values()
            if cred.user_id == user_id
        ]

        return credentials

    def remove_credential(self, user_id: int, credential_id: str) -> Dict:
        """Remove a biometric credential"""
        if credential_id not in self.credentials:
            raise Exception("Credential not found")

        credential = self.credentials[credential_id]

        if credential.user_id != user_id:
            raise Exception("Unauthorized")

        del self.credentials[credential_id]
        self._save_credentials()

        logger.info(f"Removed biometric credential {credential_id} for user {user_id}")

        return {
            "success": True,
            "message": "Credential removed successfully"
        }

    def cleanup_expired_challenges(self):
        """Remove expired challenges"""
        before_count = len(self.challenges)
        self.challenges = {
            challenge_id: challenge
            for challenge_id, challenge in self.challenges.items()
            if not challenge.is_expired()
        }
        removed = before_count - len(self.challenges)

        if removed > 0:
            self._save_challenges()
            logger.info(f"Cleaned up {removed} expired challenges")


# Singleton instance
_biometric_service: Optional[BiometricAuthService] = None


def get_biometric_service(storage_dir: Optional[Path] = None) -> BiometricAuthService:
    """Get singleton biometric service instance"""
    global _biometric_service

    if _biometric_service is None:
        if storage_dir is None:
            storage_dir = Path(__file__).parent / ".biometric_data"
        _biometric_service = BiometricAuthService(storage_dir)

    return _biometric_service
