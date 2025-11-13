"""
RBAC (Role-Based Access Control) System
Enterprise-grade access control with multi-tenant support
"""
import logging
import json
import hashlib
import secrets
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)


class Permission(str, Enum):
    """Available permissions in the system."""
    # Download permissions
    DOWNLOAD_START = "download.start"
    DOWNLOAD_STOP = "download.stop"
    DOWNLOAD_VIEW = "download.view"
    DOWNLOAD_DELETE = "download.delete"

    # Media permissions
    MEDIA_VIEW = "media.view"
    MEDIA_UPLOAD = "media.upload"
    MEDIA_DELETE = "media.delete"
    MEDIA_EXPORT = "media.export"

    # Webhook permissions
    WEBHOOK_CREATE = "webhook.create"
    WEBHOOK_EDIT = "webhook.edit"
    WEBHOOK_DELETE = "webhook.delete"
    WEBHOOK_VIEW = "webhook.view"

    # Cloud sync permissions
    CLOUD_CONFIGURE = "cloud.configure"
    CLOUD_SYNC = "cloud.sync"
    CLOUD_VIEW = "cloud.view"

    # Plugin permissions
    PLUGIN_INSTALL = "plugin.install"
    PLUGIN_UNINSTALL = "plugin.uninstall"
    PLUGIN_CONFIGURE = "plugin.configure"
    PLUGIN_VIEW = "plugin.view"

    # IPFS permissions
    IPFS_UPLOAD = "ipfs.upload"
    IPFS_DOWNLOAD = "ipfs.download"
    IPFS_PIN = "ipfs.pin"
    IPFS_UNPIN = "ipfs.unpin"

    # User management
    USER_CREATE = "user.create"
    USER_EDIT = "user.edit"
    USER_DELETE = "user.delete"
    USER_VIEW = "user.view"

    # Organization management
    ORG_CREATE = "org.create"
    ORG_EDIT = "org.edit"
    ORG_DELETE = "org.delete"
    ORG_VIEW = "org.view"
    ORG_MANAGE_USERS = "org.manage_users"

    # Role management
    ROLE_CREATE = "role.create"
    ROLE_EDIT = "role.edit"
    ROLE_DELETE = "role.delete"
    ROLE_VIEW = "role.view"

    # Settings
    SETTINGS_VIEW = "settings.view"
    SETTINGS_EDIT = "settings.edit"

    # Analytics
    ANALYTICS_VIEW = "analytics.view"
    ANALYTICS_EXPORT = "analytics.export"

    # System admin
    SYSTEM_ADMIN = "system.admin"


class Role:
    """Role with associated permissions."""

    def __init__(self, role_id: str, name: str, description: str, permissions: Set[Permission]):
        self.role_id = role_id
        self.name = name
        self.description = description
        self.permissions = permissions
        self.created_at = datetime.now().isoformat()
        self.is_system_role = False  # System roles cannot be deleted

    def has_permission(self, permission: Permission) -> bool:
        """Check if role has a specific permission."""
        return permission in self.permissions or Permission.SYSTEM_ADMIN in self.permissions

    def to_dict(self) -> Dict[str, Any]:
        """Convert role to dictionary."""
        return {
            "role_id": self.role_id,
            "name": self.name,
            "description": self.description,
            "permissions": [p.value for p in self.permissions],
            "created_at": self.created_at,
            "is_system_role": self.is_system_role
        }


class User:
    """User with roles and organization membership."""

    def __init__(self, user_id: str, username: str, email: str, organization_id: str):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.organization_id = organization_id
        self.roles: Set[str] = set()  # Role IDs
        self.api_key = self._generate_api_key()
        self.created_at = datetime.now().isoformat()
        self.last_login = None
        self.is_active = True

    def _generate_api_key(self) -> str:
        """Generate secure API key for user."""
        return f"tk_{secrets.token_urlsafe(32)}"

    def add_role(self, role_id: str):
        """Add role to user."""
        self.roles.add(role_id)

    def remove_role(self, role_id: str):
        """Remove role from user."""
        self.roles.discard(role_id)

    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary."""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "organization_id": self.organization_id,
            "roles": list(self.roles),
            "api_key": self.api_key,
            "created_at": self.created_at,
            "last_login": self.last_login,
            "is_active": self.is_active
        }


class Organization:
    """Multi-tenant organization."""

    def __init__(self, org_id: str, name: str, plan: str = "free"):
        self.org_id = org_id
        self.name = name
        self.plan = plan  # free, pro, enterprise
        self.created_at = datetime.now().isoformat()
        self.settings = {}
        self.is_active = True
        self.max_users = self._get_max_users()
        self.max_storage_gb = self._get_max_storage()

    def _get_max_users(self) -> int:
        """Get max users based on plan."""
        limits = {
            "free": 3,
            "pro": 10,
            "enterprise": 999999
        }
        return limits.get(self.plan, 3)

    def _get_max_storage(self) -> int:
        """Get max storage in GB based on plan."""
        limits = {
            "free": 10,
            "pro": 100,
            "enterprise": 999999
        }
        return limits.get(self.plan, 10)

    def to_dict(self) -> Dict[str, Any]:
        """Convert organization to dictionary."""
        return {
            "org_id": self.org_id,
            "name": self.name,
            "plan": self.plan,
            "created_at": self.created_at,
            "settings": self.settings,
            "is_active": self.is_active,
            "max_users": self.max_users,
            "max_storage_gb": self.max_storage_gb
        }


class RBACManager:
    """Manage roles, users, and organizations."""

    def __init__(self, data_file: Path):
        self.data_file = data_file
        self.roles: Dict[str, Role] = {}
        self.users: Dict[str, User] = {}
        self.organizations: Dict[str, Organization] = {}
        self.api_key_to_user: Dict[str, str] = {}  # Map API key -> user_id

        # Create default roles
        self._create_default_roles()

        # Load existing data
        self._load_data()

    def _create_default_roles(self):
        """Create default system roles."""
        # Admin role - full access
        admin_role = Role(
            role_id="admin",
            name="Administrator",
            description="Full system access",
            permissions=set([Permission.SYSTEM_ADMIN])
        )
        admin_role.is_system_role = True
        self.roles["admin"] = admin_role

        # Manager role - can manage downloads and media
        manager_permissions = {
            Permission.DOWNLOAD_START,
            Permission.DOWNLOAD_STOP,
            Permission.DOWNLOAD_VIEW,
            Permission.MEDIA_VIEW,
            Permission.MEDIA_UPLOAD,
            Permission.MEDIA_EXPORT,
            Permission.WEBHOOK_VIEW,
            Permission.WEBHOOK_CREATE,
            Permission.CLOUD_VIEW,
            Permission.CLOUD_SYNC,
            Permission.PLUGIN_VIEW,
            Permission.ANALYTICS_VIEW,
            Permission.SETTINGS_VIEW,
            Permission.USER_VIEW
        }
        manager_role = Role(
            role_id="manager",
            name="Manager",
            description="Can manage downloads and media",
            permissions=manager_permissions
        )
        manager_role.is_system_role = True
        self.roles["manager"] = manager_role

        # Viewer role - read-only access
        viewer_permissions = {
            Permission.DOWNLOAD_VIEW,
            Permission.MEDIA_VIEW,
            Permission.WEBHOOK_VIEW,
            Permission.CLOUD_VIEW,
            Permission.PLUGIN_VIEW,
            Permission.ANALYTICS_VIEW,
            Permission.SETTINGS_VIEW,
            Permission.USER_VIEW
        }
        viewer_role = Role(
            role_id="viewer",
            name="Viewer",
            description="Read-only access",
            permissions=viewer_permissions
        )
        viewer_role.is_system_role = True
        self.roles["viewer"] = viewer_role

        logger.info("Created default system roles")

    def _load_data(self):
        """Load RBAC data from file."""
        if not self.data_file.exists():
            logger.info("No RBAC data file found, starting fresh")
            return

        try:
            with open(self.data_file, 'r') as f:
                data = json.load(f)

            # Load custom roles (not system roles)
            for role_data in data.get("roles", []):
                if role_data["role_id"] not in self.roles:  # Don't override system roles
                    role = Role(
                        role_id=role_data["role_id"],
                        name=role_data["name"],
                        description=role_data["description"],
                        permissions=set([Permission(p) for p in role_data["permissions"]])
                    )
                    role.created_at = role_data.get("created_at", role.created_at)
                    self.roles[role.role_id] = role

            # Load users
            for user_data in data.get("users", []):
                user = User(
                    user_id=user_data["user_id"],
                    username=user_data["username"],
                    email=user_data["email"],
                    organization_id=user_data["organization_id"]
                )
                user.roles = set(user_data.get("roles", []))
                user.api_key = user_data.get("api_key", user.api_key)
                user.created_at = user_data.get("created_at", user.created_at)
                user.last_login = user_data.get("last_login")
                user.is_active = user_data.get("is_active", True)

                self.users[user.user_id] = user
                self.api_key_to_user[user.api_key] = user.user_id

            # Load organizations
            for org_data in data.get("organizations", []):
                org = Organization(
                    org_id=org_data["org_id"],
                    name=org_data["name"],
                    plan=org_data.get("plan", "free")
                )
                org.created_at = org_data.get("created_at", org.created_at)
                org.settings = org_data.get("settings", {})
                org.is_active = org_data.get("is_active", True)

                self.organizations[org.org_id] = org

            logger.info(f"Loaded RBAC data: {len(self.roles)} roles, {len(self.users)} users, {len(self.organizations)} orgs")

        except Exception as e:
            logger.error(f"Failed to load RBAC data: {e}")

    def _save_data(self):
        """Save RBAC data to file."""
        try:
            data = {
                "roles": [role.to_dict() for role in self.roles.values() if not role.is_system_role],
                "users": [user.to_dict() for user in self.users.values()],
                "organizations": [org.to_dict() for org in self.organizations.values()]
            }

            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)

            logger.debug("Saved RBAC data")
        except Exception as e:
            logger.error(f"Failed to save RBAC data: {e}")

    # Organization Management

    def create_organization(self, name: str, plan: str = "free") -> Organization:
        """Create new organization."""
        org_id = f"org_{secrets.token_urlsafe(8)}"
        org = Organization(org_id, name, plan)
        self.organizations[org_id] = org
        self._save_data()
        logger.info(f"Created organization: {name} ({org_id})")
        return org

    def get_organization(self, org_id: str) -> Optional[Organization]:
        """Get organization by ID."""
        return self.organizations.get(org_id)

    def list_organizations(self) -> List[Organization]:
        """List all organizations."""
        return list(self.organizations.values())

    def delete_organization(self, org_id: str) -> bool:
        """Delete organization and all its users."""
        if org_id not in self.organizations:
            return False

        # Delete all users in org
        users_to_delete = [uid for uid, user in self.users.items() if user.organization_id == org_id]
        for uid in users_to_delete:
            self.delete_user(uid)

        del self.organizations[org_id]
        self._save_data()
        logger.info(f"Deleted organization: {org_id}")
        return True

    # User Management

    def create_user(self, username: str, email: str, organization_id: str, role_ids: List[str] = None) -> Optional[User]:
        """Create new user."""
        # Check org exists
        if organization_id not in self.organizations:
            logger.error(f"Organization not found: {organization_id}")
            return None

        # Check user limit
        org = self.organizations[organization_id]
        org_users = [u for u in self.users.values() if u.organization_id == organization_id]
        if len(org_users) >= org.max_users:
            logger.error(f"Organization {organization_id} has reached user limit")
            return None

        user_id = f"user_{secrets.token_urlsafe(8)}"
        user = User(user_id, username, email, organization_id)

        # Add roles
        if role_ids:
            for role_id in role_ids:
                if role_id in self.roles:
                    user.add_role(role_id)
        else:
            # Default to viewer role
            user.add_role("viewer")

        self.users[user_id] = user
        self.api_key_to_user[user.api_key] = user_id
        self._save_data()

        logger.info(f"Created user: {username} ({user_id}) in org {organization_id}")
        return user

    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return self.users.get(user_id)

    def get_user_by_api_key(self, api_key: str) -> Optional[User]:
        """Get user by API key."""
        user_id = self.api_key_to_user.get(api_key)
        return self.users.get(user_id) if user_id else None

    def list_users(self, organization_id: Optional[str] = None) -> List[User]:
        """List users, optionally filtered by organization."""
        users = list(self.users.values())
        if organization_id:
            users = [u for u in users if u.organization_id == organization_id]
        return users

    def delete_user(self, user_id: str) -> bool:
        """Delete user."""
        if user_id not in self.users:
            return False

        user = self.users[user_id]
        del self.api_key_to_user[user.api_key]
        del self.users[user_id]
        self._save_data()

        logger.info(f"Deleted user: {user_id}")
        return True

    # Role Management

    def create_role(self, name: str, description: str, permissions: List[Permission]) -> Role:
        """Create custom role."""
        role_id = f"role_{secrets.token_urlsafe(8)}"
        role = Role(role_id, name, description, set(permissions))
        self.roles[role_id] = role
        self._save_data()
        logger.info(f"Created role: {name} ({role_id})")
        return role

    def get_role(self, role_id: str) -> Optional[Role]:
        """Get role by ID."""
        return self.roles.get(role_id)

    def list_roles(self) -> List[Role]:
        """List all roles."""
        return list(self.roles.values())

    def delete_role(self, role_id: str) -> bool:
        """Delete custom role (cannot delete system roles)."""
        if role_id not in self.roles:
            return False

        role = self.roles[role_id]
        if role.is_system_role:
            logger.error(f"Cannot delete system role: {role_id}")
            return False

        # Remove role from all users
        for user in self.users.values():
            user.remove_role(role_id)

        del self.roles[role_id]
        self._save_data()
        logger.info(f"Deleted role: {role_id}")
        return True

    # Permission Checking

    def user_has_permission(self, user_id: str, permission: Permission) -> bool:
        """Check if user has a specific permission."""
        user = self.get_user(user_id)
        if not user or not user.is_active:
            return False

        # Check all user's roles
        for role_id in user.roles:
            role = self.get_role(role_id)
            if role and role.has_permission(permission):
                return True

        return False

    def check_api_key(self, api_key: str) -> Optional[User]:
        """Validate API key and return user."""
        user = self.get_user_by_api_key(api_key)
        if user and user.is_active:
            user.last_login = datetime.now().isoformat()
            self._save_data()
            return user
        return None


# Usage example:
"""
# Initialize RBAC manager
rbac_manager = RBACManager(Path("rbac_data.json"))

# Create organization
org = rbac_manager.create_organization("Acme Corp", plan="pro")

# Create users
admin = rbac_manager.create_user("admin", "admin@acme.com", org.org_id, ["admin"])
viewer = rbac_manager.create_user("viewer", "viewer@acme.com", org.org_id, ["viewer"])

# Check permissions
has_perm = rbac_manager.user_has_permission(admin.user_id, Permission.DOWNLOAD_START)
# True

# API key authentication
user = rbac_manager.check_api_key("tk_...")
if user and rbac_manager.user_has_permission(user.user_id, Permission.MEDIA_DELETE):
    # Allow action
    pass
"""
