"""
Collaborative Workspace Manager
Handles team workspaces, permissions, and shared collections
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from enum import Enum


class Permission(Enum):
    """Permission levels"""
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class WorkspaceManager:
    """Manage collaborative workspaces"""
    
    def __init__(self, data_dir: str = "workspace_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.workspaces_file = self.data_dir / "workspaces.json"
        self.members_file = self.data_dir / "members.json"
        self.collections_file = self.data_dir / "collections.json"
        self.activity_file = self.data_dir / "activity.json"
        
        self._load_data()
    
    def _load_data(self):
        """Load workspace data"""
        self.workspaces = self._load_json(self.workspaces_file, {})
        self.members = self._load_json(self.members_file, {})
        self.collections = self._load_json(self.collections_file, {})
        self.activity = self._load_json(self.activity_file, [])
    
    def _load_json(self, file_path: Path, default):
        """Load JSON file"""
        if file_path.exists():
            with open(file_path, 'r') as f:
                return json.load(f)
        return default
    
    def _save_json(self, file_path: Path, data):
        """Save JSON file"""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def create_workspace(self, name: str, owner_id: str, description: str = "") -> Dict:
        """Create new workspace"""
        workspace_id = str(uuid.uuid4())
        workspace = {
            'id': workspace_id,
            'name': name,
            'description': description,
            'owner_id': owner_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'settings': {
                'default_permission': 'viewer',
                'allow_invites': True,
                'require_approval': False
            }
        }
        
        self.workspaces[workspace_id] = workspace
        
        # Add owner as member
        self.add_member(workspace_id, owner_id, Permission.OWNER.value, added_by=owner_id)
        
        self._save_json(self.workspaces_file, self.workspaces)
        self._log_activity(workspace_id, owner_id, "workspace_created", {"name": name})
        
        return {'success': True, 'workspace': workspace}
    
    def add_member(self, workspace_id: str, user_id: str, permission: str, added_by: str) -> Dict:
        """Add member to workspace"""
        if workspace_id not in self.workspaces:
            return {'success': False, 'error': 'Workspace not found'}
        
        member_key = f"{workspace_id}:{user_id}"
        member = {
            'workspace_id': workspace_id,
            'user_id': user_id,
            'permission': permission,
            'added_by': added_by,
            'added_at': datetime.now().isoformat(),
            'last_active': datetime.now().isoformat()
        }
        
        self.members[member_key] = member
        self._save_json(self.members_file, self.members)
        self._log_activity(workspace_id, added_by, "member_added", {
            "user_id": user_id,
            "permission": permission
        })
        
        return {'success': True, 'member': member}
    
    def update_permission(self, workspace_id: str, user_id: str, new_permission: str, updated_by: str) -> Dict:
        """Update member permission"""
        member_key = f"{workspace_id}:{user_id}"
        
        if member_key not in self.members:
            return {'success': False, 'error': 'Member not found'}
        
        old_permission = self.members[member_key]['permission']
        self.members[member_key]['permission'] = new_permission
        self.members[member_key]['updated_at'] = datetime.now().isoformat()
        
        self._save_json(self.members_file, self.members)
        self._log_activity(workspace_id, updated_by, "permission_changed", {
            "user_id": user_id,
            "old_permission": old_permission,
            "new_permission": new_permission
        })
        
        return {'success': True, 'member': self.members[member_key]}
    
    def create_collection(self, workspace_id: str, name: str, created_by: str, items: List = None) -> Dict:
        """Create shared collection"""
        if workspace_id not in self.workspaces:
            return {'success': False, 'error': 'Workspace not found'}
        
        collection_id = str(uuid.uuid4())
        collection = {
            'id': collection_id,
            'workspace_id': workspace_id,
            'name': name,
            'created_by': created_by,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'items': items or [],
            'comments': [],
            'version': 1
        }
        
        self.collections[collection_id] = collection
        self._save_json(self.collections_file, self.collections)
        self._log_activity(workspace_id, created_by, "collection_created", {"name": name, "id": collection_id})
        
        return {'success': True, 'collection': collection}
    
    def add_to_collection(self, collection_id: str, item: Dict, added_by: str) -> Dict:
        """Add item to collection"""
        if collection_id not in self.collections:
            return {'success': False, 'error': 'Collection not found'}
        
        item['id'] = str(uuid.uuid4())
        item['added_by'] = added_by
        item['added_at'] = datetime.now().isoformat()
        
        self.collections[collection_id]['items'].append(item)
        self.collections[collection_id]['updated_at'] = datetime.now().isoformat()
        self.collections[collection_id]['version'] += 1
        
        self._save_json(self.collections_file, self.collections)
        self._log_activity(
            self.collections[collection_id]['workspace_id'],
            added_by,
            "item_added",
            {"collection_id": collection_id, "item_id": item['id']}
        )
        
        return {'success': True, 'item': item}
    
    def add_comment(self, collection_id: str, user_id: str, text: str, item_id: str = None) -> Dict:
        """Add comment to collection or item"""
        if collection_id not in self.collections:
            return {'success': False, 'error': 'Collection not found'}
        
        comment = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'text': text,
            'item_id': item_id,
            'created_at': datetime.now().isoformat(),
            'edited': False
        }
        
        self.collections[collection_id]['comments'].append(comment)
        self._save_json(self.collections_file, self.collections)
        self._log_activity(
            self.collections[collection_id]['workspace_id'],
            user_id,
            "comment_added",
            {"collection_id": collection_id, "comment_id": comment['id']}
        )
        
        return {'success': True, 'comment': comment}
    
    def get_workspace_members(self, workspace_id: str) -> List[Dict]:
        """Get all workspace members"""
        members = [
            member for key, member in self.members.items()
            if key.startswith(f"{workspace_id}:")
        ]
        return members
    
    def get_workspace_collections(self, workspace_id: str) -> List[Dict]:
        """Get all workspace collections"""
        collections = [
            coll for coll in self.collections.values()
            if coll['workspace_id'] == workspace_id
        ]
        return collections
    
    def get_activity_feed(self, workspace_id: str, limit: int = 50) -> List[Dict]:
        """Get workspace activity feed"""
        activities = [
            act for act in self.activity
            if act['workspace_id'] == workspace_id
        ]
        return sorted(activities, key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    def check_permission(self, workspace_id: str, user_id: str, required_permission: Permission) -> bool:
        """Check if user has required permission"""
        member_key = f"{workspace_id}:{user_id}"
        
        if member_key not in self.members:
            return False
        
        user_permission = Permission(self.members[member_key]['permission'])
        permission_hierarchy = {
            Permission.OWNER: 4,
            Permission.ADMIN: 3,
            Permission.EDITOR: 2,
            Permission.VIEWER: 1
        }
        
        return permission_hierarchy[user_permission] >= permission_hierarchy[required_permission]
    
    def _log_activity(self, workspace_id: str, user_id: str, action: str, details: Dict):
        """Log workspace activity"""
        activity = {
            'id': str(uuid.uuid4()),
            'workspace_id': workspace_id,
            'user_id': user_id,
            'action': action,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        self.activity.append(activity)
        
        # Keep only last 1000 activities
        if len(self.activity) > 1000:
            self.activity = self.activity[-1000:]
        
        self._save_json(self.activity_file, self.activity)


# Singleton instance
_workspace_manager = None

def get_workspace_manager() -> WorkspaceManager:
    """Get workspace manager singleton"""
    global _workspace_manager
    if _workspace_manager is None:
        _workspace_manager = WorkspaceManager()
    return _workspace_manager
