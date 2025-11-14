"""
Advanced Security & Encryption Manager for Telegram Saver
Handles encryption, authentication, access control, audit logging, and security policies
"""

import json
import os
import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict, field
from enum import Enum
import uuid


class EncryptionAlgorithm(Enum):
    """Supported encryption algorithms"""
    AES_256_GCM = "aes_256_gcm"
    AES_128_GCM = "aes_128_gcm"
    CHACHA20_POLY1305 = "chacha20_poly1305"


class Role(Enum):
    """User roles for access control"""
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"
    GUEST = "guest"


class Permission(Enum):
    """System permissions"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"
    MANAGE_USERS = "manage_users"
    MANAGE_FILES = "manage_files"
    MANAGE_SETTINGS = "manage_settings"
    VIEW_AUDIT_LOGS = "view_audit_logs"


class AuditAction(Enum):
    """Audit log actions"""
    LOGIN = "login"
    LOGOUT = "logout"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    FILE_DELETE = "file_delete"
    USER_CREATED = "user_created"
    USER_MODIFIED = "user_modified"
    USER_DELETED = "user_deleted"
    PERMISSION_CHANGED = "permission_changed"
    SETTINGS_CHANGED = "settings_changed"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    SECURITY_VIOLATION = "security_violation"


@dataclass
class EncryptedData:
    """Encrypted data container"""
    algorithm: str
    ciphertext: str
    nonce: str
    tag: str
    metadata: Dict[str, Any]
    created_at: str


@dataclass
class APIKey:
    """API key for programmatic access"""
    id: str
    key: str
    name: str
    user_id: str
    permissions: List[str]
    rate_limit: int  # requests per minute
    is_active: bool
    expires_at: Optional[str]
    last_used: Optional[str]
    created_at: str


@dataclass
class UserRole:
    """User role assignment"""
    user_id: str
    username: str
    role: str
    permissions: List[str]
    created_at: str
    updated_at: str


@dataclass
class AuditLog:
    """Audit log entry"""
    id: str
    user_id: str
    username: str
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Dict[str, Any]
    success: bool
    timestamp: str


@dataclass
class SecurityPolicy:
    """Security policy configuration"""
    id: str
    name: str
    policy_type: str  # password, session, encryption, access
    enabled: bool
    settings: Dict[str, Any]
    created_at: str
    updated_at: str


@dataclass
class TwoFactorAuth:
    """Two-factor authentication settings"""
    user_id: str
    secret: str
    is_enabled: bool
    backup_codes: List[str]
    created_at: str
    last_verified: Optional[str]


@dataclass
class Session:
    """User session"""
    id: str
    user_id: str
    token: str
    ip_address: str
    user_agent: str
    created_at: str
    expires_at: str
    last_activity: str
    is_active: bool


class SecurityManager:
    """Manages security, encryption, and access control"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/security"
            os.makedirs(self.data_dir, exist_ok=True)

            self.api_keys_file = os.path.join(self.data_dir, "api_keys.json")
            self.roles_file = os.path.join(self.data_dir, "roles.json")
            self.audit_logs_file = os.path.join(self.data_dir, "audit_logs.json")
            self.policies_file = os.path.join(self.data_dir, "policies.json")
            self.twofa_file = os.path.join(self.data_dir, "twofa.json")
            self.sessions_file = os.path.join(self.data_dir, "sessions.json")

            self.api_keys: Dict[str, APIKey] = {}
            self.roles: Dict[str, UserRole] = {}
            self.audit_logs: List[AuditLog] = []
            self.policies: Dict[str, SecurityPolicy] = {}
            self.twofa: Dict[str, TwoFactorAuth] = {}
            self.sessions: Dict[str, Session] = {}

            self._load_data()
            self._initialize_default_policies()
            self.initialized = True

    def _load_data(self):
        """Load security data from files"""
        try:
            # Load API keys
            if os.path.exists(self.api_keys_file):
                with open(self.api_keys_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.api_keys = {
                        key_id: APIKey(**key_data)
                        for key_id, key_data in data.items()
                    }

            # Load roles
            if os.path.exists(self.roles_file):
                with open(self.roles_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.roles = {
                        user_id: UserRole(**role_data)
                        for user_id, role_data in data.items()
                    }

            # Load audit logs
            if os.path.exists(self.audit_logs_file):
                with open(self.audit_logs_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.audit_logs = [AuditLog(**log_data) for log_data in data]

            # Load policies
            if os.path.exists(self.policies_file):
                with open(self.policies_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.policies = {
                        policy_id: SecurityPolicy(**policy_data)
                        for policy_id, policy_data in data.items()
                    }

            # Load 2FA
            if os.path.exists(self.twofa_file):
                with open(self.twofa_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.twofa = {
                        user_id: TwoFactorAuth(**twofa_data)
                        for user_id, twofa_data in data.items()
                    }

            # Load sessions
            if os.path.exists(self.sessions_file):
                with open(self.sessions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.sessions = {
                        session_id: Session(**session_data)
                        for session_id, session_data in data.items()
                    }

        except Exception as e:
            print(f"Error loading security data: {e}")

    def _save_api_keys(self):
        """Save API keys"""
        try:
            with open(self.api_keys_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {kid: asdict(key) for kid, key in self.api_keys.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving API keys: {e}")

    def _save_roles(self):
        """Save roles"""
        try:
            with open(self.roles_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {uid: asdict(role) for uid, role in self.roles.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving roles: {e}")

    def _save_audit_logs(self):
        """Save audit logs"""
        try:
            with open(self.audit_logs_file, 'w', encoding='utf-8') as f:
                json.dump(
                    [asdict(log) for log in self.audit_logs],
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving audit logs: {e}")

    def _save_policies(self):
        """Save policies"""
        try:
            with open(self.policies_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {pid: asdict(policy) for pid, policy in self.policies.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving policies: {e}")

    def _save_twofa(self):
        """Save 2FA settings"""
        try:
            with open(self.twofa_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {uid: asdict(twofa) for uid, twofa in self.twofa.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving 2FA: {e}")

    def _save_sessions(self):
        """Save sessions"""
        try:
            with open(self.sessions_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {sid: asdict(session) for sid, session in self.sessions.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving sessions: {e}")

    def _initialize_default_policies(self):
        """Initialize default security policies"""
        if not self.policies:
            # Password policy
            self._create_policy(
                name="Password Policy",
                policy_type="password",
                settings={
                    "min_length": 8,
                    "require_uppercase": True,
                    "require_lowercase": True,
                    "require_numbers": True,
                    "require_special": True,
                    "max_age_days": 90
                }
            )

            # Session policy
            self._create_policy(
                name="Session Policy",
                policy_type="session",
                settings={
                    "timeout_minutes": 60,
                    "max_concurrent_sessions": 5,
                    "require_2fa": False
                }
            )

            # Encryption policy
            self._create_policy(
                name="Encryption Policy",
                policy_type="encryption",
                settings={
                    "algorithm": "aes_256_gcm",
                    "key_rotation_days": 30,
                    "encrypt_at_rest": True,
                    "encrypt_in_transit": True
                }
            )

    def _create_policy(self, name: str, policy_type: str, settings: Dict[str, Any]) -> str:
        """Create a security policy"""
        policy = SecurityPolicy(
            id=str(uuid.uuid4()),
            name=name,
            policy_type=policy_type,
            enabled=True,
            settings=settings,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        self.policies[policy.id] = policy
        self._save_policies()
        return policy.id

    # ============================================================================
    # ENCRYPTION & DECRYPTION
    # ============================================================================

    def encrypt_data(
        self,
        plaintext: str,
        algorithm: str = EncryptionAlgorithm.AES_256_GCM.value
    ) -> Dict:
        """Encrypt data (mock implementation)"""
        # In production, use cryptography library:
        # from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        # Mock encryption
        nonce = secrets.token_hex(16)
        key = secrets.token_hex(32)

        # Simple base64 encoding as mock (NOT SECURE - use real encryption in production)
        ciphertext = base64.b64encode(plaintext.encode()).decode()
        tag = secrets.token_hex(16)

        encrypted = EncryptedData(
            algorithm=algorithm,
            ciphertext=ciphertext,
            nonce=nonce,
            tag=tag,
            metadata={"key_hint": key[:8]},
            created_at=datetime.now().isoformat()
        )

        return {
            'success': True,
            'encrypted_data': asdict(encrypted),
            'key': key  # In production, store securely or derive from password
        }

    def decrypt_data(
        self,
        encrypted_data: Dict[str, Any],
        key: str
    ) -> Dict:
        """Decrypt data (mock implementation)"""
        try:
            # Mock decryption
            ciphertext = encrypted_data['ciphertext']
            plaintext = base64.b64decode(ciphertext).decode()

            return {
                'success': True,
                'plaintext': plaintext
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def hash_password(self, password: str) -> Dict:
        """Hash password (mock bcrypt)"""
        # In production, use bcrypt or argon2
        # import bcrypt
        # hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

        # Mock with SHA-256 + salt (NOT SECURE - use bcrypt in production)
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256((password + salt).encode()).hexdigest()

        return {
            'success': True,
            'hash': f"{salt}${hashed}"
        }

    def verify_password(self, password: str, hash_string: str) -> Dict:
        """Verify password against hash"""
        try:
            salt, hashed = hash_string.split('$')
            test_hash = hashlib.sha256((password + salt).encode()).hexdigest()

            return {
                'success': True,
                'valid': test_hash == hashed
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    # ============================================================================
    # API KEY MANAGEMENT
    # ============================================================================

    def create_api_key(
        self,
        name: str,
        user_id: str,
        permissions: List[str],
        rate_limit: int = 1000,
        expires_days: Optional[int] = None
    ) -> Dict:
        """Create an API key"""
        # Generate secure random key
        key = f"ts_{secrets.token_urlsafe(32)}"

        expires_at = None
        if expires_days:
            expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()

        api_key = APIKey(
            id=str(uuid.uuid4()),
            key=key,
            name=name,
            user_id=user_id,
            permissions=permissions,
            rate_limit=rate_limit,
            is_active=True,
            expires_at=expires_at,
            last_used=None,
            created_at=datetime.now().isoformat()
        )

        self.api_keys[api_key.id] = api_key
        self._save_api_keys()

        # Log creation
        self._log_audit(
            user_id=user_id,
            username="system",
            action=AuditAction.API_KEY_CREATED.value,
            details={"key_name": name, "key_id": api_key.id}
        )

        return {
            'success': True,
            'api_key': asdict(api_key)
        }

    def validate_api_key(self, key: str) -> Dict:
        """Validate an API key"""
        for api_key in self.api_keys.values():
            if api_key.key == key and api_key.is_active:
                # Check expiration
                if api_key.expires_at:
                    if datetime.now() > datetime.fromisoformat(api_key.expires_at):
                        return {
                            'success': False,
                            'error': 'API key expired'
                        }

                # Update last used
                api_key.last_used = datetime.now().isoformat()
                self._save_api_keys()

                return {
                    'success': True,
                    'valid': True,
                    'user_id': api_key.user_id,
                    'permissions': api_key.permissions
                }

        return {
            'success': False,
            'error': 'Invalid API key'
        }

    def revoke_api_key(self, key_id: str, user_id: str) -> Dict:
        """Revoke an API key"""
        if key_id not in self.api_keys:
            return {'success': False, 'error': 'API key not found'}

        api_key = self.api_keys[key_id]
        api_key.is_active = False
        self._save_api_keys()

        # Log revocation
        self._log_audit(
            user_id=user_id,
            username="system",
            action=AuditAction.API_KEY_REVOKED.value,
            details={"key_name": api_key.name, "key_id": key_id}
        )

        return {'success': True}

    def get_api_keys(self, user_id: Optional[str] = None) -> Dict:
        """Get API keys"""
        keys = list(self.api_keys.values())

        if user_id:
            keys = [k for k in keys if k.user_id == user_id]

        return {
            'success': True,
            'api_keys': [asdict(k) for k in keys],
            'count': len(keys)
        }

    # ============================================================================
    # ACCESS CONTROL (RBAC)
    # ============================================================================

    def assign_role(
        self,
        user_id: str,
        username: str,
        role: str
    ) -> Dict:
        """Assign role to user"""
        if role not in [r.value for r in Role]:
            return {'success': False, 'error': 'Invalid role'}

        # Get permissions for role
        permissions = self._get_role_permissions(role)

        user_role = UserRole(
            user_id=user_id,
            username=username,
            role=role,
            permissions=permissions,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        self.roles[user_id] = user_role
        self._save_roles()

        return {
            'success': True,
            'role': asdict(user_role)
        }

    def _get_role_permissions(self, role: str) -> List[str]:
        """Get permissions for a role"""
        role_permissions = {
            Role.ADMIN.value: [p.value for p in Permission],
            Role.MODERATOR.value: [
                Permission.READ.value,
                Permission.WRITE.value,
                Permission.MANAGE_FILES.value,
                Permission.VIEW_AUDIT_LOGS.value
            ],
            Role.USER.value: [
                Permission.READ.value,
                Permission.WRITE.value
            ],
            Role.GUEST.value: [
                Permission.READ.value
            ]
        }
        return role_permissions.get(role, [])

    def check_permission(
        self,
        user_id: str,
        permission: str
    ) -> Dict:
        """Check if user has permission"""
        if user_id not in self.roles:
            return {'success': False, 'error': 'User role not found'}

        user_role = self.roles[user_id]
        has_permission = permission in user_role.permissions

        return {
            'success': True,
            'has_permission': has_permission,
            'role': user_role.role
        }

    def get_user_role(self, user_id: str) -> Dict:
        """Get user role"""
        if user_id not in self.roles:
            return {'success': False, 'error': 'User role not found'}

        return {
            'success': True,
            'role': asdict(self.roles[user_id])
        }

    # ============================================================================
    # AUDIT LOGGING
    # ============================================================================

    def _log_audit(
        self,
        user_id: str,
        username: str,
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict] = None,
        success: bool = True
    ):
        """Log an audit event"""
        log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {},
            success=success,
            timestamp=datetime.now().isoformat()
        )

        self.audit_logs.append(log)

        # Keep only last 10000 logs
        if len(self.audit_logs) > 10000:
            self.audit_logs = self.audit_logs[-10000:]

        self._save_audit_logs()

    def get_audit_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100
    ) -> Dict:
        """Get audit logs"""
        logs = self.audit_logs

        if user_id:
            logs = [log for log in logs if log.user_id == user_id]

        if action:
            logs = [log for log in logs if log.action == action]

        # Sort by timestamp descending
        logs = sorted(logs, key=lambda x: x.timestamp, reverse=True)
        logs = logs[:limit]

        return {
            'success': True,
            'logs': [asdict(log) for log in logs],
            'count': len(logs)
        }

    # ============================================================================
    # TWO-FACTOR AUTHENTICATION
    # ============================================================================

    def enable_2fa(self, user_id: str) -> Dict:
        """Enable 2FA for user"""
        # Generate secret (in production, use pyotp)
        secret = secrets.token_hex(16)

        # Generate backup codes
        backup_codes = [secrets.token_hex(4) for _ in range(10)]

        twofa = TwoFactorAuth(
            user_id=user_id,
            secret=secret,
            is_enabled=True,
            backup_codes=backup_codes,
            created_at=datetime.now().isoformat(),
            last_verified=None
        )

        self.twofa[user_id] = twofa
        self._save_twofa()

        return {
            'success': True,
            'secret': secret,
            'backup_codes': backup_codes
        }

    def verify_2fa_token(self, user_id: str, token: str) -> Dict:
        """Verify 2FA token"""
        if user_id not in self.twofa:
            return {'success': False, 'error': '2FA not enabled'}

        twofa = self.twofa[user_id]

        # Mock verification (in production, use pyotp.TOTP)
        # For demo, accept the secret as valid token
        valid = token == twofa.secret[:6]

        if valid:
            twofa.last_verified = datetime.now().isoformat()
            self._save_twofa()

        return {
            'success': True,
            'valid': valid
        }

    def disable_2fa(self, user_id: str) -> Dict:
        """Disable 2FA for user"""
        if user_id not in self.twofa:
            return {'success': False, 'error': '2FA not enabled'}

        del self.twofa[user_id]
        self._save_twofa()

        return {'success': True}

    # ============================================================================
    # SESSION MANAGEMENT
    # ============================================================================

    def create_session(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str,
        duration_hours: int = 24
    ) -> Dict:
        """Create a user session"""
        token = secrets.token_urlsafe(32)

        session = Session(
            id=str(uuid.uuid4()),
            user_id=user_id,
            token=token,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now().isoformat(),
            expires_at=(datetime.now() + timedelta(hours=duration_hours)).isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        self.sessions[session.id] = session
        self._save_sessions()

        return {
            'success': True,
            'session': asdict(session)
        }

    def validate_session(self, token: str) -> Dict:
        """Validate a session token"""
        for session in self.sessions.values():
            if session.token == token and session.is_active:
                # Check expiration
                if datetime.now() > datetime.fromisoformat(session.expires_at):
                    session.is_active = False
                    self._save_sessions()
                    return {
                        'success': False,
                        'error': 'Session expired'
                    }

                # Update last activity
                session.last_activity = datetime.now().isoformat()
                self._save_sessions()

                return {
                    'success': True,
                    'valid': True,
                    'user_id': session.user_id,
                    'session_id': session.id
                }

        return {
            'success': False,
            'error': 'Invalid session token'
        }

    def revoke_session(self, session_id: str) -> Dict:
        """Revoke a session"""
        if session_id not in self.sessions:
            return {'success': False, 'error': 'Session not found'}

        session = self.sessions[session_id]
        session.is_active = False
        self._save_sessions()

        return {'success': True}

    def get_statistics(self) -> Dict:
        """Get security statistics"""
        active_sessions = len([s for s in self.sessions.values() if s.is_active])
        active_api_keys = len([k for k in self.api_keys.values() if k.is_active])
        enabled_2fa_users = len([t for t in self.twofa.values() if t.is_enabled])

        # Recent security events
        recent_logs = sorted(self.audit_logs, key=lambda x: x.timestamp, reverse=True)[:100]
        failed_attempts = len([log for log in recent_logs if not log.success])

        return {
            'success': True,
            'statistics': {
                'total_users': len(self.roles),
                'active_sessions': active_sessions,
                'active_api_keys': active_api_keys,
                'enabled_2fa_users': enabled_2fa_users,
                'total_audit_logs': len(self.audit_logs),
                'failed_attempts_last_100': failed_attempts,
                'policies_enabled': len([p for p in self.policies.values() if p.enabled])
            }
        }


# Singleton instance
security_manager = SecurityManager()
