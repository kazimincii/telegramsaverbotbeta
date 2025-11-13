"""
Advanced Download Manager
Provides pause/resume, priority queue, speed limiting, retry, and verification
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from collections import deque
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Callable
import aiohttp

logger = logging.getLogger(__name__)


class DownloadStatus(Enum):
    """Download status enumeration"""
    PENDING = "pending"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFYING = "verifying"
    RETRYING = "retrying"


class DownloadPriority(Enum):
    """Download priority levels"""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


@dataclass
class DownloadTask:
    """Download task data structure"""
    id: str
    url: str
    destination: str
    filename: str
    status: DownloadStatus = DownloadStatus.PENDING
    priority: DownloadPriority = DownloadPriority.NORMAL

    # Progress tracking
    total_size: int = 0
    downloaded_size: int = 0
    progress: float = 0.0
    speed: float = 0.0  # bytes per second
    eta: int = 0  # seconds

    # Metadata
    created_at: float = 0.0
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

    # Retry & verification
    retry_count: int = 0
    max_retries: int = 3
    checksum: Optional[str] = None
    checksum_algorithm: str = "sha256"

    # Speed limiting
    speed_limit: Optional[int] = None  # bytes per second, None = unlimited

    # Error tracking
    error_message: Optional[str] = None

    # Multi-connection settings
    connections: int = 1  # Number of parallel connections
    chunk_size: int = 8192  # Download chunk size

    # Resume support
    supports_resume: bool = False
    resume_position: int = 0


class DownloadManager:
    """
    Advanced Download Manager with queue, pause/resume, speed limiting
    """

    def __init__(self, max_concurrent_downloads: int = 3):
        self.max_concurrent_downloads = max_concurrent_downloads
        self.downloads: Dict[str, DownloadTask] = {}
        self.download_queue: deque = deque()
        self.active_downloads: Dict[str, asyncio.Task] = {}
        self.download_history: List[Dict] = []

        # Statistics
        self.stats = {
            'total_downloads': 0,
            'completed_downloads': 0,
            'failed_downloads': 0,
            'total_bytes_downloaded': 0,
            'average_speed': 0.0
        }

        # Speed tracking for graphs
        self.speed_history: Dict[str, List[Dict]] = {}

        # Bandwidth scheduling
        self.bandwidth_schedule: Dict[str, Dict] = {}
        self.current_speed_limit: Optional[int] = None

        # Load state from disk
        self._load_state()

    def add_download(
        self,
        url: str,
        destination: str,
        filename: str,
        priority: DownloadPriority = DownloadPriority.NORMAL,
        checksum: Optional[str] = None,
        speed_limit: Optional[int] = None,
        connections: int = 1
    ) -> str:
        """Add a new download to the queue"""
        import uuid

        task_id = str(uuid.uuid4())

        task = DownloadTask(
            id=task_id,
            url=url,
            destination=destination,
            filename=filename,
            priority=priority,
            created_at=time.time(),
            checksum=checksum,
            speed_limit=speed_limit,
            connections=connections
        )

        self.downloads[task_id] = task
        self.download_queue.append(task_id)
        self._sort_queue_by_priority()

        logger.info(f"Added download: {filename} (ID: {task_id})")

        # Start processing queue if not full
        asyncio.create_task(self._process_queue())

        return task_id

    def _sort_queue_by_priority(self):
        """Sort download queue by priority"""
        # Convert deque to list, sort, convert back
        queue_list = list(self.download_queue)
        queue_list.sort(
            key=lambda task_id: self.downloads[task_id].priority.value,
            reverse=True
        )
        self.download_queue = deque(queue_list)

    async def _process_queue(self):
        """Process download queue"""
        while self.download_queue and len(self.active_downloads) < self.max_concurrent_downloads:
            task_id = self.download_queue.popleft()
            task = self.downloads.get(task_id)

            if not task or task.status != DownloadStatus.PENDING:
                continue

            # Start download
            download_task = asyncio.create_task(self._download_file(task_id))
            self.active_downloads[task_id] = download_task

    async def _download_file(self, task_id: str):
        """Download a file with resume support"""
        task = self.downloads[task_id]

        try:
            task.status = DownloadStatus.DOWNLOADING
            task.started_at = time.time()

            # Create destination directory
            os.makedirs(task.destination, exist_ok=True)
            file_path = os.path.join(task.destination, task.filename)

            # Check if partial download exists
            if os.path.exists(file_path):
                task.resume_position = os.path.getsize(file_path)
                task.downloaded_size = task.resume_position

            # Download headers to check resume support and total size
            async with aiohttp.ClientSession() as session:
                headers = {}
                if task.resume_position > 0:
                    headers['Range'] = f'bytes={task.resume_position}-'

                async with session.get(task.url, headers=headers, timeout=aiohttp.ClientTimeout(total=None)) as response:
                    # Check if server supports resume
                    if response.status == 206:  # Partial Content
                        task.supports_resume = True
                    elif response.status == 200 and task.resume_position > 0:
                        # Server doesn't support resume, restart
                        task.resume_position = 0
                        task.downloaded_size = 0
                        task.supports_resume = False

                    # Get total size
                    if 'Content-Length' in response.headers:
                        content_length = int(response.headers['Content-Length'])
                        if task.resume_position > 0:
                            task.total_size = task.resume_position + content_length
                        else:
                            task.total_size = content_length

                    # Download file
                    mode = 'ab' if task.supports_resume and task.resume_position > 0 else 'wb'

                    async with aiohttp.ClientSession() as download_session:
                        async with download_session.get(task.url, headers=headers) as dl_response:
                            with open(file_path, mode) as f:
                                last_update = time.time()
                                bytes_since_update = 0

                                async for chunk in dl_response.content.iter_chunked(task.chunk_size):
                                    # Check if paused
                                    while task.status == DownloadStatus.PAUSED:
                                        await asyncio.sleep(0.1)

                                    # Write chunk
                                    f.write(chunk)
                                    chunk_size = len(chunk)
                                    task.downloaded_size += chunk_size
                                    bytes_since_update += chunk_size

                                    # Update progress
                                    if task.total_size > 0:
                                        task.progress = (task.downloaded_size / task.total_size) * 100

                                    # Calculate speed (update every second)
                                    current_time = time.time()
                                    time_diff = current_time - last_update

                                    if time_diff >= 1.0:
                                        task.speed = bytes_since_update / time_diff

                                        # Calculate ETA
                                        if task.speed > 0 and task.total_size > 0:
                                            remaining = task.total_size - task.downloaded_size
                                            task.eta = int(remaining / task.speed)

                                        # Record speed for graph
                                        if task_id not in self.speed_history:
                                            self.speed_history[task_id] = []

                                        self.speed_history[task_id].append({
                                            'timestamp': current_time,
                                            'speed': task.speed,
                                            'downloaded': task.downloaded_size
                                        })

                                        # Keep only last 100 data points
                                        if len(self.speed_history[task_id]) > 100:
                                            self.speed_history[task_id].pop(0)

                                        last_update = current_time
                                        bytes_since_update = 0

                                    # Apply speed limit
                                    if task.speed_limit and task.speed > task.speed_limit:
                                        delay = chunk_size / task.speed_limit
                                        await asyncio.sleep(delay)

            # Download completed
            task.status = DownloadStatus.COMPLETED
            task.completed_at = time.time()
            task.progress = 100.0

            # Verify checksum if provided
            if task.checksum:
                await self._verify_checksum(task_id, file_path)

            # Update stats
            self.stats['completed_downloads'] += 1
            self.stats['total_bytes_downloaded'] += task.downloaded_size

            # Add to history
            self._add_to_history(task)

            logger.info(f"Download completed: {task.filename}")

        except asyncio.CancelledError:
            logger.info(f"Download cancelled: {task.filename}")
            task.status = DownloadStatus.PAUSED

        except Exception as e:
            logger.error(f"Download failed: {task.filename} - {str(e)}")
            task.status = DownloadStatus.FAILED
            task.error_message = str(e)

            # Retry if allowed
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = DownloadStatus.RETRYING
                logger.info(f"Retrying download: {task.filename} (Attempt {task.retry_count + 1})")
                await asyncio.sleep(2 ** task.retry_count)  # Exponential backoff
                await self._download_file(task_id)
            else:
                self.stats['failed_downloads'] += 1
                self._add_to_history(task)

        finally:
            # Remove from active downloads
            if task_id in self.active_downloads:
                del self.active_downloads[task_id]

            # Process next in queue
            await self._process_queue()

            # Save state
            self._save_state()

    async def _verify_checksum(self, task_id: str, file_path: str):
        """Verify file checksum"""
        task = self.downloads[task_id]
        task.status = DownloadStatus.VERIFYING

        try:
            # Calculate checksum
            hash_algo = hashlib.new(task.checksum_algorithm)

            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hash_algo.update(chunk)

            calculated_checksum = hash_algo.hexdigest()

            # Compare
            if calculated_checksum.lower() != task.checksum.lower():
                raise ValueError(f"Checksum mismatch: expected {task.checksum}, got {calculated_checksum}")

            logger.info(f"Checksum verified: {task.filename}")

        except Exception as e:
            logger.error(f"Checksum verification failed: {str(e)}")
            task.status = DownloadStatus.FAILED
            task.error_message = f"Checksum verification failed: {str(e)}"
            raise

    def pause_download(self, task_id: str) -> bool:
        """Pause a download"""
        task = self.downloads.get(task_id)

        if not task or task.status != DownloadStatus.DOWNLOADING:
            return False

        task.status = DownloadStatus.PAUSED
        logger.info(f"Download paused: {task.filename}")

        self._save_state()
        return True

    def resume_download(self, task_id: str) -> bool:
        """Resume a paused download"""
        task = self.downloads.get(task_id)

        if not task or task.status != DownloadStatus.PAUSED:
            return False

        task.status = DownloadStatus.PENDING
        self.download_queue.append(task_id)
        self._sort_queue_by_priority()

        logger.info(f"Download resumed: {task.filename}")

        # Process queue
        asyncio.create_task(self._process_queue())

        return True

    def cancel_download(self, task_id: str) -> bool:
        """Cancel a download"""
        task = self.downloads.get(task_id)

        if not task:
            return False

        # Cancel active download task
        if task_id in self.active_downloads:
            self.active_downloads[task_id].cancel()
            del self.active_downloads[task_id]

        # Remove from queue
        if task_id in self.download_queue:
            self.download_queue.remove(task_id)

        # Delete partial file
        file_path = os.path.join(task.destination, task.filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.error(f"Failed to delete partial file: {str(e)}")

        # Remove from downloads
        del self.downloads[task_id]

        logger.info(f"Download cancelled: {task.filename}")

        self._save_state()
        return True

    def retry_failed_download(self, task_id: str) -> bool:
        """Retry a failed download"""
        task = self.downloads.get(task_id)

        if not task or task.status != DownloadStatus.FAILED:
            return False

        # Reset task
        task.status = DownloadStatus.PENDING
        task.retry_count = 0
        task.error_message = None
        task.downloaded_size = 0
        task.resume_position = 0
        task.progress = 0.0

        self.download_queue.append(task_id)
        self._sort_queue_by_priority()

        logger.info(f"Retrying failed download: {task.filename}")

        # Process queue
        asyncio.create_task(self._process_queue())

        return True

    def set_priority(self, task_id: str, priority: DownloadPriority) -> bool:
        """Change download priority"""
        task = self.downloads.get(task_id)

        if not task:
            return False

        task.priority = priority

        if task.status == DownloadStatus.PENDING:
            self._sort_queue_by_priority()

        logger.info(f"Priority changed for {task.filename}: {priority.name}")

        self._save_state()
        return True

    def set_speed_limit(self, task_id: str, speed_limit: Optional[int]) -> bool:
        """Set speed limit for a download (bytes per second)"""
        task = self.downloads.get(task_id)

        if not task:
            return False

        task.speed_limit = speed_limit

        logger.info(f"Speed limit set for {task.filename}: {speed_limit or 'unlimited'}")

        return True

    def get_download(self, task_id: str) -> Optional[Dict]:
        """Get download task details"""
        task = self.downloads.get(task_id)

        if not task:
            return None

        return {
            **asdict(task),
            'status': task.status.value,
            'priority': task.priority.value
        }

    def get_all_downloads(self) -> List[Dict]:
        """Get all downloads"""
        return [
            {
                **asdict(task),
                'status': task.status.value,
                'priority': task.priority.value
            }
            for task in self.downloads.values()
        ]

    def get_download_history(self, limit: int = 100) -> List[Dict]:
        """Get download history"""
        return self.download_history[-limit:]

    def get_statistics(self) -> Dict:
        """Get download statistics"""
        return self.stats.copy()

    def get_speed_history(self, task_id: str) -> List[Dict]:
        """Get speed history for a download"""
        return self.speed_history.get(task_id, [])

    def _add_to_history(self, task: DownloadTask):
        """Add completed/failed download to history"""
        history_entry = {
            'id': task.id,
            'filename': task.filename,
            'url': task.url,
            'status': task.status.value,
            'total_size': task.total_size,
            'downloaded_size': task.downloaded_size,
            'created_at': task.created_at,
            'started_at': task.started_at,
            'completed_at': task.completed_at,
            'error_message': task.error_message,
            'retry_count': task.retry_count
        }

        self.download_history.append(history_entry)

        # Keep only last 1000 entries
        if len(self.download_history) > 1000:
            self.download_history.pop(0)

    def _save_state(self):
        """Save download state to disk"""
        try:
            state = {
                'downloads': {
                    task_id: {
                        **asdict(task),
                        'status': task.status.value,
                        'priority': task.priority.value
                    }
                    for task_id, task in self.downloads.items()
                },
                'history': self.download_history,
                'stats': self.stats
            }

            state_file = Path('download_manager_state.json')
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)

        except Exception as e:
            logger.error(f"Failed to save state: {str(e)}")

    def _load_state(self):
        """Load download state from disk"""
        try:
            state_file = Path('download_manager_state.json')

            if not state_file.exists():
                return

            with open(state_file, 'r') as f:
                state = json.load(f)

            # Restore downloads
            for task_id, task_data in state.get('downloads', {}).items():
                task_data['status'] = DownloadStatus(task_data['status'])
                task_data['priority'] = DownloadPriority(task_data['priority'])
                task = DownloadTask(**task_data)
                self.downloads[task_id] = task

                # Add pending downloads to queue
                if task.status == DownloadStatus.PENDING:
                    self.download_queue.append(task_id)

            self._sort_queue_by_priority()

            # Restore history
            self.download_history = state.get('history', [])

            # Restore stats
            self.stats = state.get('stats', self.stats)

            logger.info(f"Loaded {len(self.downloads)} downloads from state")

        except Exception as e:
            logger.error(f"Failed to load state: {str(e)}")


# Singleton instance
_download_manager_instance = None


def get_download_manager() -> DownloadManager:
    """Get download manager singleton instance"""
    global _download_manager_instance

    if _download_manager_instance is None:
        _download_manager_instance = DownloadManager()

    return _download_manager_instance
