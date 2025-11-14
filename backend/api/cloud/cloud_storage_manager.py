"""
Advanced Cloud Storage Manager for Telegram Saver
Supports multiple cloud storage providers: Google Drive, Dropbox, OneDrive, AWS S3
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
import hashlib


class CloudProvider(Enum):
    """Supported cloud storage providers"""
    GOOGLE_DRIVE = "google_drive"
    DROPBOX = "dropbox"
    ONEDRIVE = "onedrive"
    AWS_S3 = "aws_s3"
    CUSTOM = "custom"


class SyncStatus(Enum):
    """File synchronization status"""
    SYNCED = "synced"
    PENDING = "pending"
    SYNCING = "syncing"
    FAILED = "failed"
    CONFLICT = "conflict"


class ConflictResolution(Enum):
    """Conflict resolution strategies"""
    KEEP_LOCAL = "keep_local"
    KEEP_REMOTE = "keep_remote"
    KEEP_BOTH = "keep_both"
    ASK_USER = "ask_user"


@dataclass
class CloudAccount:
    """Cloud storage account configuration"""
    id: str
    user_id: str
    provider: str
    account_name: str
    email: str
    access_token: str
    refresh_token: Optional[str]
    storage_quota: int  # in bytes
    storage_used: int  # in bytes
    is_active: bool
    sync_enabled: bool
    auto_upload: bool
    created_at: str
    updated_at: str


@dataclass
class CloudFile:
    """Cloud file metadata"""
    id: str
    account_id: str
    provider: str
    local_path: str
    remote_path: str
    file_size: int
    file_hash: str
    sync_status: str
    last_synced: Optional[str]
    version: int
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str


@dataclass
class SyncTask:
    """Synchronization task"""
    id: str
    account_id: str
    file_id: str
    operation: str  # upload, download, delete
    status: str
    progress: float
    bytes_transferred: int
    total_bytes: int
    error_message: Optional[str]
    started_at: str
    completed_at: Optional[str]


@dataclass
class SyncConflict:
    """Sync conflict information"""
    id: str
    file_id: str
    local_path: str
    remote_path: str
    local_modified: str
    remote_modified: str
    local_size: int
    remote_size: int
    resolution: Optional[str]
    resolved_at: Optional[str]
    created_at: str


class CloudStorageManager:
    """Manages cloud storage integration and synchronization"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/cloud"
            os.makedirs(self.data_dir, exist_ok=True)

            self.accounts_file = os.path.join(self.data_dir, "accounts.json")
            self.files_file = os.path.join(self.data_dir, "files.json")
            self.tasks_file = os.path.join(self.data_dir, "tasks.json")
            self.conflicts_file = os.path.join(self.data_dir, "conflicts.json")

            self.accounts: Dict[str, CloudAccount] = {}
            self.files: Dict[str, CloudFile] = {}
            self.tasks: Dict[str, SyncTask] = {}
            self.conflicts: Dict[str, SyncConflict] = {}

            self._load_data()
            self.initialized = True

    def _load_data(self):
        """Load cloud storage data from files"""
        try:
            # Load accounts
            if os.path.exists(self.accounts_file):
                with open(self.accounts_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.accounts = {
                        acc_id: CloudAccount(**acc_data)
                        for acc_id, acc_data in data.items()
                    }

            # Load files
            if os.path.exists(self.files_file):
                with open(self.files_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.files = {
                        file_id: CloudFile(**file_data)
                        for file_id, file_data in data.items()
                    }

            # Load tasks
            if os.path.exists(self.tasks_file):
                with open(self.tasks_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.tasks = {
                        task_id: SyncTask(**task_data)
                        for task_id, task_data in data.items()
                    }

            # Load conflicts
            if os.path.exists(self.conflicts_file):
                with open(self.conflicts_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.conflicts = {
                        conflict_id: SyncConflict(**conflict_data)
                        for conflict_id, conflict_data in data.items()
                    }

        except Exception as e:
            print(f"Error loading cloud storage data: {e}")

    def _save_accounts(self):
        """Save accounts to file"""
        try:
            with open(self.accounts_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {aid: asdict(acc) for aid, acc in self.accounts.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving accounts: {e}")

    def _save_files(self):
        """Save files to file"""
        try:
            with open(self.files_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {fid: asdict(file) for fid, file in self.files.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving files: {e}")

    def _save_tasks(self):
        """Save tasks to file"""
        try:
            with open(self.tasks_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {tid: asdict(task) for tid, task in self.tasks.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving tasks: {e}")

    def _save_conflicts(self):
        """Save conflicts to file"""
        try:
            with open(self.conflicts_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {cid: asdict(conflict) for cid, conflict in self.conflicts.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving conflicts: {e}")

    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of a file"""
        if not os.path.exists(file_path):
            return ""

        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def add_account(
        self,
        user_id: str,
        provider: str,
        account_name: str,
        email: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        storage_quota: int = 15 * 1024 * 1024 * 1024  # 15GB default
    ) -> Dict:
        """Add a new cloud storage account"""
        if provider not in [p.value for p in CloudProvider]:
            return {'success': False, 'error': 'Unsupported provider'}

        account = CloudAccount(
            id=str(uuid.uuid4()),
            user_id=user_id,
            provider=provider,
            account_name=account_name,
            email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            storage_quota=storage_quota,
            storage_used=0,
            is_active=True,
            sync_enabled=True,
            auto_upload=False,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        self.accounts[account.id] = account
        self._save_accounts()

        return {
            'success': True,
            'account': asdict(account)
        }

    def get_accounts(self, user_id: Optional[str] = None) -> Dict:
        """Get all accounts, optionally filtered by user"""
        accounts = list(self.accounts.values())

        if user_id:
            accounts = [acc for acc in accounts if acc.user_id == user_id]

        return {
            'success': True,
            'accounts': [asdict(acc) for acc in accounts],
            'count': len(accounts)
        }

    def get_account(self, account_id: str) -> Dict:
        """Get account by ID"""
        if account_id not in self.accounts:
            return {'success': False, 'error': 'Account not found'}

        return {
            'success': True,
            'account': asdict(self.accounts[account_id])
        }

    def update_account(
        self,
        account_id: str,
        **kwargs
    ) -> Dict:
        """Update account settings"""
        if account_id not in self.accounts:
            return {'success': False, 'error': 'Account not found'}

        account = self.accounts[account_id]

        # Update allowed fields
        allowed_fields = ['account_name', 'sync_enabled', 'auto_upload', 'is_active']
        for field in allowed_fields:
            if field in kwargs:
                setattr(account, field, kwargs[field])

        account.updated_at = datetime.now().isoformat()
        self._save_accounts()

        return {
            'success': True,
            'account': asdict(account)
        }

    def delete_account(self, account_id: str) -> Dict:
        """Delete a cloud storage account"""
        if account_id not in self.accounts:
            return {'success': False, 'error': 'Account not found'}

        # Delete associated files
        for file_id in list(self.files.keys()):
            if self.files[file_id].account_id == account_id:
                del self.files[file_id]
        self._save_files()

        # Delete account
        del self.accounts[account_id]
        self._save_accounts()

        return {'success': True}

    def upload_file(
        self,
        account_id: str,
        local_path: str,
        remote_path: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Upload file to cloud storage"""
        if account_id not in self.accounts:
            return {'success': False, 'error': 'Account not found'}

        if not os.path.exists(local_path):
            return {'success': False, 'error': 'Local file not found'}

        account = self.accounts[account_id]
        file_size = os.path.getsize(local_path)
        file_hash = self._calculate_file_hash(local_path)

        # Check if file already exists
        existing_file = None
        for file in self.files.values():
            if file.account_id == account_id and file.remote_path == remote_path:
                existing_file = file
                break

        if existing_file:
            # Update existing file
            existing_file.local_path = local_path
            existing_file.file_size = file_size
            existing_file.file_hash = file_hash
            existing_file.sync_status = SyncStatus.SYNCING.value
            existing_file.version += 1
            existing_file.updated_at = datetime.now().isoformat()
            file_id = existing_file.id
        else:
            # Create new file record
            cloud_file = CloudFile(
                id=str(uuid.uuid4()),
                account_id=account_id,
                provider=account.provider,
                local_path=local_path,
                remote_path=remote_path,
                file_size=file_size,
                file_hash=file_hash,
                sync_status=SyncStatus.SYNCING.value,
                last_synced=None,
                version=1,
                metadata=metadata or {},
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            self.files[cloud_file.id] = cloud_file
            file_id = cloud_file.id

        # Create sync task
        task = SyncTask(
            id=str(uuid.uuid4()),
            account_id=account_id,
            file_id=file_id,
            operation='upload',
            status='running',
            progress=0.0,
            bytes_transferred=0,
            total_bytes=file_size,
            error_message=None,
            started_at=datetime.now().isoformat(),
            completed_at=None
        )
        self.tasks[task.id] = task

        self._save_files()
        self._save_tasks()

        # Mock upload completion (in production, this would be async)
        self._complete_upload_task(task.id)

        return {
            'success': True,
            'file': asdict(self.files[file_id]),
            'task': asdict(task)
        }

    def _complete_upload_task(self, task_id: str):
        """Mark upload task as complete (mock)"""
        if task_id not in self.tasks:
            return

        task = self.tasks[task_id]
        task.status = 'completed'
        task.progress = 100.0
        task.bytes_transferred = task.total_bytes
        task.completed_at = datetime.now().isoformat()

        # Update file status
        if task.file_id in self.files:
            file = self.files[task.file_id]
            file.sync_status = SyncStatus.SYNCED.value
            file.last_synced = datetime.now().isoformat()

        self._save_tasks()
        self._save_files()

    def download_file(
        self,
        file_id: str,
        local_path: str
    ) -> Dict:
        """Download file from cloud storage"""
        if file_id not in self.files:
            return {'success': False, 'error': 'File not found'}

        file = self.files[file_id]

        # Create sync task
        task = SyncTask(
            id=str(uuid.uuid4()),
            account_id=file.account_id,
            file_id=file_id,
            operation='download',
            status='running',
            progress=0.0,
            bytes_transferred=0,
            total_bytes=file.file_size,
            error_message=None,
            started_at=datetime.now().isoformat(),
            completed_at=None
        )
        self.tasks[task.id] = task
        self._save_tasks()

        # Mock download completion
        self._complete_download_task(task.id, local_path)

        return {
            'success': True,
            'task': asdict(task)
        }

    def _complete_download_task(self, task_id: str, local_path: str):
        """Mark download task as complete (mock)"""
        if task_id not in self.tasks:
            return

        task = self.tasks[task_id]
        task.status = 'completed'
        task.progress = 100.0
        task.bytes_transferred = task.total_bytes
        task.completed_at = datetime.now().isoformat()

        # Update file
        if task.file_id in self.files:
            file = self.files[task.file_id]
            file.local_path = local_path
            file.sync_status = SyncStatus.SYNCED.value
            file.last_synced = datetime.now().isoformat()

        self._save_tasks()
        self._save_files()

    def sync_folder(
        self,
        account_id: str,
        local_folder: str,
        remote_folder: str
    ) -> Dict:
        """Synchronize an entire folder"""
        if account_id not in self.accounts:
            return {'success': False, 'error': 'Account not found'}

        if not os.path.exists(local_folder):
            return {'success': False, 'error': 'Local folder not found'}

        uploaded_files = []
        failed_files = []

        # Walk through local folder
        for root, dirs, files in os.walk(local_folder):
            for filename in files:
                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, local_folder)
                remote_path = os.path.join(remote_folder, relative_path).replace('\\', '/')

                result = self.upload_file(account_id, local_path, remote_path)
                if result['success']:
                    uploaded_files.append(result['file'])
                else:
                    failed_files.append({
                        'file': local_path,
                        'error': result['error']
                    })

        return {
            'success': True,
            'uploaded': len(uploaded_files),
            'failed': len(failed_files),
            'files': uploaded_files,
            'errors': failed_files
        }

    def get_files(
        self,
        account_id: Optional[str] = None,
        sync_status: Optional[str] = None
    ) -> Dict:
        """Get cloud files, optionally filtered"""
        files = list(self.files.values())

        if account_id:
            files = [f for f in files if f.account_id == account_id]

        if sync_status:
            files = [f for f in files if f.sync_status == sync_status]

        return {
            'success': True,
            'files': [asdict(f) for f in files],
            'count': len(files)
        }

    def get_sync_tasks(
        self,
        account_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict:
        """Get sync tasks, optionally filtered"""
        tasks = list(self.tasks.values())

        if account_id:
            tasks = [t for t in tasks if t.account_id == account_id]

        if status:
            tasks = [t for t in tasks if t.status == status]

        # Sort by started_at descending
        tasks = sorted(tasks, key=lambda x: x.started_at, reverse=True)

        return {
            'success': True,
            'tasks': [asdict(t) for t in tasks],
            'count': len(tasks)
        }

    def detect_conflicts(self) -> Dict:
        """Detect sync conflicts"""
        conflicts_found = []

        for file in self.files.values():
            if not os.path.exists(file.local_path):
                continue

            local_hash = self._calculate_file_hash(file.local_path)
            if local_hash != file.file_hash:
                # Potential conflict
                conflict = SyncConflict(
                    id=str(uuid.uuid4()),
                    file_id=file.id,
                    local_path=file.local_path,
                    remote_path=file.remote_path,
                    local_modified=datetime.fromtimestamp(
                        os.path.getmtime(file.local_path)
                    ).isoformat(),
                    remote_modified=file.updated_at,
                    local_size=os.path.getsize(file.local_path),
                    remote_size=file.file_size,
                    resolution=None,
                    resolved_at=None,
                    created_at=datetime.now().isoformat()
                )
                self.conflicts[conflict.id] = conflict
                conflicts_found.append(conflict)

        self._save_conflicts()

        return {
            'success': True,
            'conflicts': [asdict(c) for c in conflicts_found],
            'count': len(conflicts_found)
        }

    def resolve_conflict(
        self,
        conflict_id: str,
        resolution: str
    ) -> Dict:
        """Resolve a sync conflict"""
        if conflict_id not in self.conflicts:
            return {'success': False, 'error': 'Conflict not found'}

        if resolution not in [r.value for r in ConflictResolution]:
            return {'success': False, 'error': 'Invalid resolution strategy'}

        conflict = self.conflicts[conflict_id]
        conflict.resolution = resolution
        conflict.resolved_at = datetime.now().isoformat()

        # Apply resolution
        file = self.files.get(conflict.file_id)
        if file:
            if resolution == ConflictResolution.KEEP_LOCAL.value:
                # Re-upload local file
                self.upload_file(
                    file.account_id,
                    conflict.local_path,
                    conflict.remote_path
                )
            elif resolution == ConflictResolution.KEEP_REMOTE.value:
                # Re-download remote file
                self.download_file(file.id, conflict.local_path)
            elif resolution == ConflictResolution.KEEP_BOTH.value:
                # Rename local file and download remote
                base, ext = os.path.splitext(conflict.local_path)
                new_local_path = f"{base}_local{ext}"
                if os.path.exists(conflict.local_path):
                    os.rename(conflict.local_path, new_local_path)
                self.download_file(file.id, conflict.local_path)

        self._save_conflicts()

        return {
            'success': True,
            'conflict': asdict(conflict)
        }

    def get_statistics(self, user_id: Optional[str] = None) -> Dict:
        """Get cloud storage statistics"""
        accounts = list(self.accounts.values())
        if user_id:
            accounts = [acc for acc in accounts if acc.user_id == user_id]

        files = list(self.files.values())
        if user_id:
            account_ids = [acc.id for acc in accounts]
            files = [f for f in files if f.account_id in account_ids]

        total_storage_quota = sum(acc.storage_quota for acc in accounts)
        total_storage_used = sum(f.file_size for f in files)

        # By provider
        by_provider = {}
        for acc in accounts:
            provider = acc.provider
            by_provider[provider] = by_provider.get(provider, 0) + 1

        # By sync status
        by_status = {}
        for file in files:
            status = file.sync_status
            by_status[status] = by_status.get(status, 0) + 1

        return {
            'success': True,
            'statistics': {
                'total_accounts': len(accounts),
                'total_files': len(files),
                'total_storage_quota': total_storage_quota,
                'total_storage_used': total_storage_used,
                'storage_percentage': (total_storage_used / total_storage_quota * 100) if total_storage_quota > 0 else 0,
                'accounts_by_provider': by_provider,
                'files_by_status': by_status,
                'active_tasks': len([t for t in self.tasks.values() if t.status == 'running'])
            }
        }


# Singleton instance
cloud_storage_manager = CloudStorageManager()
