"""
Automation Engine for Telegram Saver
Handles scheduled tasks, auto-download rules, and custom scripts
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import re
import asyncio
from pathlib import Path


class TriggerType(Enum):
    """Types of automation triggers"""
    SCHEDULE = "schedule"  # Time-based
    EVENT = "event"  # Event-based (new file, error, etc.)
    MANUAL = "manual"  # Manually triggered
    CONDITION = "condition"  # Condition-based


class ActionType(Enum):
    """Types of automation actions"""
    DOWNLOAD = "download"
    UPLOAD = "upload"
    MOVE = "move"
    DELETE = "delete"
    TAG = "tag"
    NOTIFY = "notify"
    SCRIPT = "script"
    WEBHOOK = "webhook"


class ScheduleType(Enum):
    """Schedule frequency types"""
    ONCE = "once"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CRON = "cron"


@dataclass
class AutomationRule:
    """Automation rule definition"""
    id: str
    name: str
    description: str
    enabled: bool
    trigger_type: str
    trigger_config: Dict[str, Any]
    actions: List[Dict[str, Any]]
    conditions: List[Dict[str, Any]]
    created_at: str
    last_run: Optional[str] = None
    run_count: int = 0


@dataclass
class AutomationLog:
    """Automation execution log"""
    id: str
    rule_id: str
    timestamp: str
    status: str  # success, failure, partial
    message: str
    details: Dict[str, Any]


class AutomationEngine:
    """Manages automation rules and execution"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/automation"
            os.makedirs(self.data_dir, exist_ok=True)

            self.rules_file = os.path.join(self.data_dir, "rules.json")
            self.logs_file = os.path.join(self.data_dir, "logs.json")
            self.scripts_dir = os.path.join(self.data_dir, "scripts")
            os.makedirs(self.scripts_dir, exist_ok=True)

            self.rules: Dict[str, AutomationRule] = {}
            self.logs: List[AutomationLog] = []
            self.running_tasks: Dict[str, asyncio.Task] = {}

            self._load_data()
            self.initialized = True

    def _load_data(self):
        """Load automation data from files"""
        try:
            if os.path.exists(self.rules_file):
                with open(self.rules_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.rules = {
                        rule_id: AutomationRule(**rule_data)
                        for rule_id, rule_data in data.items()
                    }

            if os.path.exists(self.logs_file):
                with open(self.logs_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.logs = [AutomationLog(**log) for log in data]
        except Exception as e:
            print(f"Error loading automation data: {e}")

    def _save_data(self):
        """Save automation data to files"""
        try:
            with open(self.rules_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {rid: asdict(rule) for rid, rule in self.rules.items()},
                    f,
                    indent=2
                )

            with open(self.logs_file, 'w', encoding='utf-8') as f:
                json.dump([asdict(log) for log in self.logs[-1000:]], f, indent=2)
        except Exception as e:
            print(f"Error saving automation data: {e}")

    def create_rule(
        self,
        name: str,
        description: str,
        trigger_type: str,
        trigger_config: Dict,
        actions: List[Dict],
        conditions: Optional[List[Dict]] = None
    ) -> Dict:
        """Create a new automation rule"""
        import uuid

        rule = AutomationRule(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            enabled=True,
            trigger_type=trigger_type,
            trigger_config=trigger_config,
            actions=actions,
            conditions=conditions or [],
            created_at=datetime.now().isoformat()
        )

        self.rules[rule.id] = rule
        self._save_data()

        # Start scheduled task if needed
        if rule.enabled and trigger_type == TriggerType.SCHEDULE.value:
            self._start_scheduled_task(rule)

        return {
            'success': True,
            'rule_id': rule.id,
            'rule': asdict(rule)
        }

    def update_rule(self, rule_id: str, updates: Dict) -> Dict:
        """Update an existing rule"""
        if rule_id not in self.rules:
            return {'success': False, 'error': 'Rule not found'}

        rule = self.rules[rule_id]

        # Update fields
        for key, value in updates.items():
            if hasattr(rule, key):
                setattr(rule, key, value)

        self._save_data()

        # Restart scheduled task if needed
        if rule.enabled and rule.trigger_type == TriggerType.SCHEDULE.value:
            self._stop_scheduled_task(rule_id)
            self._start_scheduled_task(rule)
        elif not rule.enabled:
            self._stop_scheduled_task(rule_id)

        return {
            'success': True,
            'rule': asdict(rule)
        }

    def delete_rule(self, rule_id: str) -> Dict:
        """Delete a rule"""
        if rule_id not in self.rules:
            return {'success': False, 'error': 'Rule not found'}

        self._stop_scheduled_task(rule_id)
        del self.rules[rule_id]
        self._save_data()

        return {'success': True}

    def get_rules(self, enabled_only: bool = False) -> Dict:
        """Get all automation rules"""
        rules = self.rules.values()

        if enabled_only:
            rules = [r for r in rules if r.enabled]

        return {
            'success': True,
            'rules': [asdict(r) for r in rules],
            'count': len(rules)
        }

    def get_rule(self, rule_id: str) -> Dict:
        """Get a specific rule"""
        if rule_id not in self.rules:
            return {'success': False, 'error': 'Rule not found'}

        return {
            'success': True,
            'rule': asdict(self.rules[rule_id])
        }

    async def execute_rule(self, rule_id: str, manual: bool = False) -> Dict:
        """Execute a rule manually or automatically"""
        if rule_id not in self.rules:
            return {'success': False, 'error': 'Rule not found'}

        rule = self.rules[rule_id]

        if not rule.enabled and not manual:
            return {'success': False, 'error': 'Rule is disabled'}

        # Check conditions
        if not self._check_conditions(rule.conditions):
            return {
                'success': False,
                'error': 'Conditions not met'
            }

        # Execute actions
        results = []
        for action in rule.actions:
            result = await self._execute_action(action)
            results.append(result)

        # Update rule stats
        rule.last_run = datetime.now().isoformat()
        rule.run_count += 1
        self._save_data()

        # Log execution
        success_count = sum(1 for r in results if r.get('success'))
        status = 'success' if success_count == len(results) else \
                 'partial' if success_count > 0 else 'failure'

        self._add_log(
            rule_id=rule_id,
            status=status,
            message=f"Executed {len(results)} actions",
            details={'results': results}
        )

        return {
            'success': True,
            'status': status,
            'results': results
        }

    def _check_conditions(self, conditions: List[Dict]) -> bool:
        """Check if all conditions are met"""
        if not conditions:
            return True

        for condition in conditions:
            condition_type = condition.get('type')

            if condition_type == 'file_exists':
                path = condition.get('path', '')
                if not os.path.exists(path):
                    return False

            elif condition_type == 'file_size':
                path = condition.get('path', '')
                operator = condition.get('operator', '>')
                size = condition.get('size', 0)

                if os.path.exists(path):
                    file_size = os.path.getsize(path)
                    if operator == '>' and file_size <= size:
                        return False
                    elif operator == '<' and file_size >= size:
                        return False
                else:
                    return False

            elif condition_type == 'time_range':
                start = condition.get('start', '00:00')
                end = condition.get('end', '23:59')
                now = datetime.now().strftime('%H:%M')

                if not (start <= now <= end):
                    return False

            elif condition_type == 'day_of_week':
                days = condition.get('days', [])
                current_day = datetime.now().strftime('%A').lower()

                if current_day not in [d.lower() for d in days]:
                    return False

        return True

    async def _execute_action(self, action: Dict) -> Dict:
        """Execute a single action"""
        action_type = action.get('type')

        try:
            if action_type == ActionType.DOWNLOAD.value:
                return await self._action_download(action)

            elif action_type == ActionType.MOVE.value:
                return await self._action_move(action)

            elif action_type == ActionType.DELETE.value:
                return await self._action_delete(action)

            elif action_type == ActionType.TAG.value:
                return await self._action_tag(action)

            elif action_type == ActionType.NOTIFY.value:
                return await self._action_notify(action)

            elif action_type == ActionType.SCRIPT.value:
                return await self._action_script(action)

            elif action_type == ActionType.WEBHOOK.value:
                return await self._action_webhook(action)

            else:
                return {
                    'success': False,
                    'error': f'Unknown action type: {action_type}'
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def _action_download(self, action: Dict) -> Dict:
        """Execute download action"""
        url = action.get('url', '')
        destination = action.get('destination', 'downloads/')

        # Placeholder - integrate with actual download manager
        return {
            'success': True,
            'action': 'download',
            'url': url,
            'destination': destination
        }

    async def _action_move(self, action: Dict) -> Dict:
        """Execute move action"""
        source = action.get('source', '')
        destination = action.get('destination', '')

        if os.path.exists(source):
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            os.rename(source, destination)
            return {'success': True, 'action': 'move'}

        return {'success': False, 'error': 'Source file not found'}

    async def _action_delete(self, action: Dict) -> Dict:
        """Execute delete action"""
        path = action.get('path', '')
        pattern = action.get('pattern', '')

        deleted = []

        if pattern:
            # Delete files matching pattern
            import glob
            files = glob.glob(pattern)
            for file in files:
                os.remove(file)
                deleted.append(file)
        elif path and os.path.exists(path):
            os.remove(path)
            deleted.append(path)

        return {
            'success': True,
            'action': 'delete',
            'deleted': deleted
        }

    async def _action_tag(self, action: Dict) -> Dict:
        """Execute tag action"""
        files = action.get('files', [])
        tags = action.get('tags', [])

        # Placeholder - integrate with tag system
        return {
            'success': True,
            'action': 'tag',
            'files': len(files),
            'tags': tags
        }

    async def _action_notify(self, action: Dict) -> Dict:
        """Execute notification action"""
        title = action.get('title', 'Automation Notification')
        message = action.get('message', '')

        # Placeholder - integrate with notification system
        return {
            'success': True,
            'action': 'notify',
            'title': title,
            'message': message
        }

    async def _action_script(self, action: Dict) -> Dict:
        """Execute custom script"""
        script_name = action.get('script', '')
        params = action.get('params', {})

        script_path = os.path.join(self.scripts_dir, script_name)

        if not os.path.exists(script_path):
            return {'success': False, 'error': 'Script not found'}

        # Execute Python script
        import subprocess
        result = subprocess.run(
            ['python', script_path],
            capture_output=True,
            text=True,
            timeout=30
        )

        return {
            'success': result.returncode == 0,
            'action': 'script',
            'script': script_name,
            'output': result.stdout,
            'error': result.stderr if result.returncode != 0 else None
        }

    async def _action_webhook(self, action: Dict) -> Dict:
        """Execute webhook action"""
        url = action.get('url', '')
        method = action.get('method', 'POST')
        payload = action.get('payload', {})

        # Placeholder - integrate with webhook system
        return {
            'success': True,
            'action': 'webhook',
            'url': url,
            'method': method
        }

    def _start_scheduled_task(self, rule: AutomationRule):
        """Start a scheduled task for a rule"""
        if rule.id in self.running_tasks:
            return

        schedule_type = rule.trigger_config.get('schedule_type')

        async def scheduled_task():
            while True:
                await self.execute_rule(rule.id)

                # Calculate next run time
                if schedule_type == ScheduleType.HOURLY.value:
                    await asyncio.sleep(3600)
                elif schedule_type == ScheduleType.DAILY.value:
                    await asyncio.sleep(86400)
                elif schedule_type == ScheduleType.WEEKLY.value:
                    await asyncio.sleep(604800)
                else:
                    break  # For ONCE type

        task = asyncio.create_task(scheduled_task())
        self.running_tasks[rule.id] = task

    def _stop_scheduled_task(self, rule_id: str):
        """Stop a scheduled task"""
        if rule_id in self.running_tasks:
            self.running_tasks[rule_id].cancel()
            del self.running_tasks[rule_id]

    def _add_log(self, rule_id: str, status: str, message: str, details: Dict):
        """Add execution log"""
        import uuid

        log = AutomationLog(
            id=str(uuid.uuid4()),
            rule_id=rule_id,
            timestamp=datetime.now().isoformat(),
            status=status,
            message=message,
            details=details
        )

        self.logs.append(log)

        # Keep only last 1000 logs
        if len(self.logs) > 1000:
            self.logs = self.logs[-1000:]

        self._save_data()

    def get_logs(self, rule_id: Optional[str] = None, limit: int = 100) -> Dict:
        """Get execution logs"""
        logs = self.logs

        if rule_id:
            logs = [log for log in logs if log.rule_id == rule_id]

        logs = logs[-limit:]

        return {
            'success': True,
            'logs': [asdict(log) for log in logs],
            'count': len(logs)
        }

    def save_script(self, name: str, content: str) -> Dict:
        """Save a custom script"""
        script_path = os.path.join(self.scripts_dir, name)

        try:
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return {
                'success': True,
                'script': name,
                'path': script_path
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_scripts(self) -> Dict:
        """Get list of saved scripts"""
        scripts = []

        for file in os.listdir(self.scripts_dir):
            if file.endswith('.py'):
                script_path = os.path.join(self.scripts_dir, file)
                with open(script_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                scripts.append({
                    'name': file,
                    'size': os.path.getsize(script_path),
                    'modified': datetime.fromtimestamp(
                        os.path.getmtime(script_path)
                    ).isoformat()
                })

        return {
            'success': True,
            'scripts': scripts
        }


# Singleton instance
automation_engine = AutomationEngine()
