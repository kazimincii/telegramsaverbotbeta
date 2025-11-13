"""
Scheduled Downloads - Cron-like scheduling for automated downloads
"""
import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import asyncio

logger = logging.getLogger(__name__)


class ScheduleType(str, Enum):
    """Types of schedules."""
    ONCE = "once"  # Run once at specific time
    DAILY = "daily"  # Run daily at specific time
    WEEKLY = "weekly"  # Run weekly on specific day
    INTERVAL = "interval"  # Run at fixed intervals (hours)


class ScheduleStatus(str, Enum):
    """Status of scheduled tasks."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScheduledTask:
    """Represents a scheduled download task."""

    def __init__(
        self,
        task_id: str,
        name: str,
        schedule_type: ScheduleType,
        chats: Optional[List[str]] = None,
        media_types: Optional[List[str]] = None,
        enabled: bool = True,
        **kwargs
    ):
        self.task_id = task_id
        self.name = name
        self.schedule_type = schedule_type
        self.chats = chats or []
        self.media_types = media_types or ["photos", "videos"]
        self.enabled = enabled
        self.status = ScheduleStatus.PENDING
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.run_count = 0

        # Schedule-specific parameters
        self.hour = kwargs.get("hour", 0)  # Hour of day (0-23)
        self.minute = kwargs.get("minute", 0)  # Minute (0-59)
        self.day_of_week = kwargs.get("day_of_week", 0)  # 0=Monday, 6=Sunday
        self.interval_hours = kwargs.get("interval_hours", 24)  # For interval type
        self.run_date = kwargs.get("run_date")  # For once type (ISO format)

        self._calculate_next_run()

    def _calculate_next_run(self):
        """Calculate next run time based on schedule type."""
        now = datetime.now()

        if not self.enabled:
            self.next_run = None
            return

        if self.schedule_type == ScheduleType.ONCE:
            if self.run_date:
                self.next_run = datetime.fromisoformat(self.run_date)
            else:
                self.next_run = None

        elif self.schedule_type == ScheduleType.DAILY:
            # Daily at specific hour:minute
            next_run = now.replace(hour=self.hour, minute=self.minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
            self.next_run = next_run

        elif self.schedule_type == ScheduleType.WEEKLY:
            # Weekly on specific day
            days_ahead = self.day_of_week - now.weekday()
            if days_ahead < 0:  # Target day already passed this week
                days_ahead += 7
            elif days_ahead == 0:  # Today but check time
                next_run = now.replace(hour=self.hour, minute=self.minute, second=0, microsecond=0)
                if next_run <= now:
                    days_ahead = 7

            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=self.hour, minute=self.minute, second=0, microsecond=0)
            self.next_run = next_run

        elif self.schedule_type == ScheduleType.INTERVAL:
            # Interval-based scheduling
            if self.last_run:
                self.next_run = self.last_run + timedelta(hours=self.interval_hours)
            else:
                # First run immediately or at next interval
                self.next_run = now

    def should_run(self) -> bool:
        """Check if task should run now."""
        if not self.enabled or not self.next_run:
            return False

        now = datetime.now()
        return now >= self.next_run

    def mark_completed(self):
        """Mark task as completed and calculate next run."""
        self.last_run = datetime.now()
        self.run_count += 1
        self.status = ScheduleStatus.COMPLETED

        # For ONCE type, disable after completion
        if self.schedule_type == ScheduleType.ONCE:
            self.enabled = False
            self.next_run = None
        else:
            self._calculate_next_run()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "name": self.name,
            "schedule_type": self.schedule_type.value,
            "chats": self.chats,
            "media_types": self.media_types,
            "enabled": self.enabled,
            "status": self.status.value,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "run_count": self.run_count,
            "hour": self.hour,
            "minute": self.minute,
            "day_of_week": self.day_of_week,
            "interval_hours": self.interval_hours,
            "run_date": self.run_date
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduledTask":
        """Create from dictionary."""
        task = cls(
            task_id=data["task_id"],
            name=data["name"],
            schedule_type=ScheduleType(data["schedule_type"]),
            chats=data.get("chats"),
            media_types=data.get("media_types"),
            enabled=data.get("enabled", True),
            hour=data.get("hour", 0),
            minute=data.get("minute", 0),
            day_of_week=data.get("day_of_week", 0),
            interval_hours=data.get("interval_hours", 24),
            run_date=data.get("run_date")
        )
        task.status = ScheduleStatus(data.get("status", "pending"))
        task.run_count = data.get("run_count", 0)
        if data.get("last_run"):
            task.last_run = datetime.fromisoformat(data["last_run"])
        return task


class TaskScheduler:
    """Manage scheduled download tasks."""

    def __init__(self, tasks_file: Path):
        self.tasks_file = tasks_file
        self.tasks: Dict[str, ScheduledTask] = {}
        self.running = False
        self.scheduler_task: Optional[asyncio.Task] = None
        self._load_tasks()

    def _load_tasks(self):
        """Load tasks from file."""
        if self.tasks_file.exists():
            try:
                data = json.loads(self.tasks_file.read_text("utf-8"))
                for task_data in data.get("tasks", []):
                    task = ScheduledTask.from_dict(task_data)
                    self.tasks[task.task_id] = task
                logger.info(f"Loaded {len(self.tasks)} scheduled tasks")
            except Exception as e:
                logger.error(f"Failed to load scheduled tasks: {e}")
                self.tasks = {}

    def _save_tasks(self):
        """Save tasks to file."""
        try:
            data = {
                "tasks": [task.to_dict() for task in self.tasks.values()]
            }
            self.tasks_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
            logger.info(f"Saved {len(self.tasks)} scheduled tasks")
        except Exception as e:
            logger.error(f"Failed to save scheduled tasks: {e}")

    def add_task(self, task: ScheduledTask) -> bool:
        """Add a new scheduled task."""
        try:
            self.tasks[task.task_id] = task
            self._save_tasks()
            logger.info(f"Added scheduled task: {task.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to add task: {e}")
            return False

    def remove_task(self, task_id: str) -> bool:
        """Remove a scheduled task."""
        if task_id in self.tasks:
            del self.tasks[task_id]
            self._save_tasks()
            logger.info(f"Removed scheduled task: {task_id}")
            return True
        return False

    def get_task(self, task_id: str) -> Optional[ScheduledTask]:
        """Get a specific task."""
        return self.tasks.get(task_id)

    def list_tasks(self) -> List[ScheduledTask]:
        """List all tasks."""
        return list(self.tasks.values())

    def enable_task(self, task_id: str) -> bool:
        """Enable a task."""
        task = self.tasks.get(task_id)
        if task:
            task.enabled = True
            task._calculate_next_run()
            self._save_tasks()
            return True
        return False

    def disable_task(self, task_id: str) -> bool:
        """Disable a task."""
        task = self.tasks.get(task_id)
        if task:
            task.enabled = False
            task.next_run = None
            self._save_tasks()
            return True
        return False

    async def run_scheduler(self, download_callback):
        """Main scheduler loop - checks and runs tasks."""
        logger.info("Scheduler started")
        self.running = True

        while self.running:
            try:
                # Check all tasks
                for task in self.tasks.values():
                    if task.should_run():
                        logger.info(f"Running scheduled task: {task.name}")
                        task.status = ScheduleStatus.RUNNING
                        self._save_tasks()

                        try:
                            # Execute download callback
                            await download_callback(
                                chats=task.chats,
                                media_types=task.media_types
                            )
                            task.mark_completed()
                            logger.info(f"Task completed: {task.name}")
                        except Exception as e:
                            task.status = ScheduleStatus.FAILED
                            logger.error(f"Task failed: {task.name} - {e}")

                        self._save_tasks()

                # Sleep for 60 seconds before next check
                await asyncio.sleep(60)

            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)

        logger.info("Scheduler stopped")

    def start(self, download_callback):
        """Start the scheduler."""
        if not self.running:
            self.scheduler_task = asyncio.create_task(
                self.run_scheduler(download_callback)
            )
            logger.info("Scheduler task created")

    def stop(self):
        """Stop the scheduler."""
        self.running = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
            logger.info("Scheduler stopped")


# Usage example (commented):
"""
# Create scheduler
scheduler = TaskScheduler(Path("scheduled_tasks.json"))

# Add daily task
import uuid
task = ScheduledTask(
    task_id=str(uuid.uuid4()),
    name="Daily backup at 2 AM",
    schedule_type=ScheduleType.DAILY,
    hour=2,
    minute=0,
    chats=["MyChannel"],
    media_types=["photos", "videos"]
)
scheduler.add_task(task)

# Start scheduler with download callback
async def download_callback(chats, media_types):
    # Your download logic here
    pass

scheduler.start(download_callback)
"""
