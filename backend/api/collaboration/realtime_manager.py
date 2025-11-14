"""
Real-time Collaboration Manager for Telegram Saver
Handles chat, presence, activity feeds, notifications, and collaborative sessions
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict, field
from enum import Enum
import uuid


class PresenceStatus(Enum):
    """User presence status"""
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"
    DND = "dnd"  # Do Not Disturb


class MessageType(Enum):
    """Chat message types"""
    TEXT = "text"
    FILE = "file"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    LINK = "link"
    SYSTEM = "system"


class ActivityType(Enum):
    """Activity event types"""
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    FILE_UPLOADED = "file_uploaded"
    FILE_DOWNLOADED = "file_downloaded"
    FILE_SHARED = "file_shared"
    MESSAGE_SENT = "message_sent"
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    COMMENT_ADDED = "comment_added"


class NotificationType(Enum):
    """Notification types"""
    MENTION = "mention"
    REPLY = "reply"
    REACTION = "reaction"
    FILE_SHARED = "file_shared"
    TASK_ASSIGNED = "task_assigned"
    SYSTEM = "system"


@dataclass
class UserPresence:
    """User presence information"""
    user_id: str
    username: str
    status: str
    last_seen: str
    current_session: Optional[str]
    active_rooms: List[str]
    metadata: Dict[str, Any]


@dataclass
class ChatRoom:
    """Chat room/channel"""
    id: str
    name: str
    description: str
    room_type: str  # public, private, direct
    members: List[str]
    created_by: str
    created_at: str
    last_activity: str
    message_count: int
    metadata: Dict[str, Any]


@dataclass
class ChatMessage:
    """Chat message"""
    id: str
    room_id: str
    user_id: str
    username: str
    message_type: str
    content: str
    attachments: List[Dict[str, Any]]
    reply_to: Optional[str]
    reactions: Dict[str, List[str]]  # emoji -> list of user_ids
    mentions: List[str]
    is_edited: bool
    is_deleted: bool
    created_at: str
    updated_at: str


@dataclass
class Activity:
    """Activity event"""
    id: str
    activity_type: str
    user_id: str
    username: str
    description: str
    metadata: Dict[str, Any]
    room_id: Optional[str]
    created_at: str


@dataclass
class Notification:
    """User notification"""
    id: str
    user_id: str
    notification_type: str
    title: str
    message: str
    link: Optional[str]
    is_read: bool
    metadata: Dict[str, Any]
    created_at: str


@dataclass
class CollaborativeSession:
    """Collaborative editing session"""
    id: str
    name: str
    resource_type: str  # document, file, folder
    resource_id: str
    participants: List[str]
    created_by: str
    created_at: str
    last_activity: str
    is_active: bool
    cursors: Dict[str, Dict[str, Any]]  # user_id -> cursor position
    locks: Dict[str, str]  # resource_section -> user_id


class RealtimeCollaborationManager:
    """Manages real-time collaboration features"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/collaboration"
            os.makedirs(self.data_dir, exist_ok=True)

            self.presence_file = os.path.join(self.data_dir, "presence.json")
            self.rooms_file = os.path.join(self.data_dir, "rooms.json")
            self.messages_file = os.path.join(self.data_dir, "messages.json")
            self.activities_file = os.path.join(self.data_dir, "activities.json")
            self.notifications_file = os.path.join(self.data_dir, "notifications.json")
            self.sessions_file = os.path.join(self.data_dir, "sessions.json")

            self.presence: Dict[str, UserPresence] = {}
            self.rooms: Dict[str, ChatRoom] = {}
            self.messages: Dict[str, ChatMessage] = {}
            self.activities: List[Activity] = []
            self.notifications: Dict[str, Notification] = {}
            self.sessions: Dict[str, CollaborativeSession] = {}

            # WebSocket connections (mock - in production use websockets library)
            self.connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids

            self._load_data()
            self.initialized = True

    def _load_data(self):
        """Load collaboration data from files"""
        try:
            # Load presence
            if os.path.exists(self.presence_file):
                with open(self.presence_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.presence = {
                        uid: UserPresence(**pres_data)
                        for uid, pres_data in data.items()
                    }

            # Load rooms
            if os.path.exists(self.rooms_file):
                with open(self.rooms_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.rooms = {
                        rid: ChatRoom(**room_data)
                        for rid, room_data in data.items()
                    }

            # Load messages
            if os.path.exists(self.messages_file):
                with open(self.messages_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.messages = {
                        mid: ChatMessage(**msg_data)
                        for mid, msg_data in data.items()
                    }

            # Load activities
            if os.path.exists(self.activities_file):
                with open(self.activities_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.activities = [Activity(**act_data) for act_data in data]

            # Load notifications
            if os.path.exists(self.notifications_file):
                with open(self.notifications_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.notifications = {
                        nid: Notification(**notif_data)
                        for nid, notif_data in data.items()
                    }

            # Load sessions
            if os.path.exists(self.sessions_file):
                with open(self.sessions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.sessions = {
                        sid: CollaborativeSession(**sess_data)
                        for sid, sess_data in data.items()
                    }

        except Exception as e:
            print(f"Error loading collaboration data: {e}")

    def _save_presence(self):
        """Save presence data"""
        try:
            with open(self.presence_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {uid: asdict(pres) for uid, pres in self.presence.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving presence: {e}")

    def _save_rooms(self):
        """Save rooms data"""
        try:
            with open(self.rooms_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {rid: asdict(room) for rid, room in self.rooms.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving rooms: {e}")

    def _save_messages(self):
        """Save messages data"""
        try:
            with open(self.messages_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {mid: asdict(msg) for mid, msg in self.messages.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving messages: {e}")

    def _save_activities(self):
        """Save activities data"""
        try:
            with open(self.activities_file, 'w', encoding='utf-8') as f:
                json.dump(
                    [asdict(act) for act in self.activities],
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving activities: {e}")

    def _save_notifications(self):
        """Save notifications data"""
        try:
            with open(self.notifications_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {nid: asdict(notif) for nid, notif in self.notifications.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving notifications: {e}")

    def _save_sessions(self):
        """Save sessions data"""
        try:
            with open(self.sessions_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {sid: asdict(sess) for sid, sess in self.sessions.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving sessions: {e}")

    # ============================================================================
    # PRESENCE MANAGEMENT
    # ============================================================================

    def update_presence(
        self,
        user_id: str,
        username: str,
        status: str,
        current_session: Optional[str] = None
    ) -> Dict:
        """Update user presence"""
        if status not in [s.value for s in PresenceStatus]:
            return {'success': False, 'error': 'Invalid status'}

        if user_id in self.presence:
            presence = self.presence[user_id]
            presence.status = status
            presence.last_seen = datetime.now().isoformat()
            if current_session:
                presence.current_session = current_session
        else:
            presence = UserPresence(
                user_id=user_id,
                username=username,
                status=status,
                last_seen=datetime.now().isoformat(),
                current_session=current_session,
                active_rooms=[],
                metadata={}
            )
            self.presence[user_id] = presence

        self._save_presence()

        return {
            'success': True,
            'presence': asdict(presence)
        }

    def get_presence(self, user_id: Optional[str] = None) -> Dict:
        """Get user presence"""
        if user_id:
            if user_id not in self.presence:
                return {'success': False, 'error': 'User not found'}
            return {
                'success': True,
                'presence': asdict(self.presence[user_id])
            }

        # Get all online users
        online_users = [
            asdict(p) for p in self.presence.values()
            if p.status == PresenceStatus.ONLINE.value
        ]

        return {
            'success': True,
            'online_users': online_users,
            'count': len(online_users)
        }

    def join_room(self, user_id: str, room_id: str) -> Dict:
        """User joins a room"""
        if user_id not in self.presence:
            return {'success': False, 'error': 'User presence not found'}

        if room_id not in self.rooms:
            return {'success': False, 'error': 'Room not found'}

        presence = self.presence[user_id]
        if room_id not in presence.active_rooms:
            presence.active_rooms.append(room_id)
            self._save_presence()

        # Create activity
        self._create_activity(
            activity_type=ActivityType.USER_JOINED.value,
            user_id=user_id,
            username=presence.username,
            description=f"{presence.username} joined the room",
            room_id=room_id
        )

        return {'success': True}

    def leave_room(self, user_id: str, room_id: str) -> Dict:
        """User leaves a room"""
        if user_id not in self.presence:
            return {'success': False, 'error': 'User presence not found'}

        presence = self.presence[user_id]
        if room_id in presence.active_rooms:
            presence.active_rooms.remove(room_id)
            self._save_presence()

        # Create activity
        self._create_activity(
            activity_type=ActivityType.USER_LEFT.value,
            user_id=user_id,
            username=presence.username,
            description=f"{presence.username} left the room",
            room_id=room_id
        )

        return {'success': True}

    # ============================================================================
    # CHAT ROOMS
    # ============================================================================

    def create_room(
        self,
        name: str,
        description: str,
        room_type: str,
        created_by: str,
        members: Optional[List[str]] = None
    ) -> Dict:
        """Create a chat room"""
        if room_type not in ['public', 'private', 'direct']:
            return {'success': False, 'error': 'Invalid room type'}

        room = ChatRoom(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            room_type=room_type,
            members=members or [created_by],
            created_by=created_by,
            created_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            message_count=0,
            metadata={}
        )

        self.rooms[room.id] = room
        self._save_rooms()

        return {
            'success': True,
            'room': asdict(room)
        }

    def get_rooms(self, user_id: Optional[str] = None) -> Dict:
        """Get chat rooms"""
        rooms = list(self.rooms.values())

        if user_id:
            # Filter rooms where user is a member
            rooms = [r for r in rooms if user_id in r.members or r.room_type == 'public']

        return {
            'success': True,
            'rooms': [asdict(r) for r in rooms],
            'count': len(rooms)
        }

    def add_room_member(self, room_id: str, user_id: str) -> Dict:
        """Add member to room"""
        if room_id not in self.rooms:
            return {'success': False, 'error': 'Room not found'}

        room = self.rooms[room_id]
        if user_id not in room.members:
            room.members.append(user_id)
            self._save_rooms()

        return {'success': True}

    # ============================================================================
    # MESSAGES
    # ============================================================================

    def send_message(
        self,
        room_id: str,
        user_id: str,
        username: str,
        content: str,
        message_type: str = 'text',
        attachments: Optional[List[Dict]] = None,
        reply_to: Optional[str] = None,
        mentions: Optional[List[str]] = None
    ) -> Dict:
        """Send a chat message"""
        if room_id not in self.rooms:
            return {'success': False, 'error': 'Room not found'}

        message = ChatMessage(
            id=str(uuid.uuid4()),
            room_id=room_id,
            user_id=user_id,
            username=username,
            message_type=message_type,
            content=content,
            attachments=attachments or [],
            reply_to=reply_to,
            reactions={},
            mentions=mentions or [],
            is_edited=False,
            is_deleted=False,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        self.messages[message.id] = message
        self._save_messages()

        # Update room
        room = self.rooms[room_id]
        room.message_count += 1
        room.last_activity = datetime.now().isoformat()
        self._save_rooms()

        # Create activity
        self._create_activity(
            activity_type=ActivityType.MESSAGE_SENT.value,
            user_id=user_id,
            username=username,
            description=f"{username} sent a message",
            room_id=room_id
        )

        # Create notifications for mentions
        if mentions:
            for mentioned_user_id in mentions:
                self._create_notification(
                    user_id=mentioned_user_id,
                    notification_type=NotificationType.MENTION.value,
                    title=f"{username} mentioned you",
                    message=content[:100],
                    link=f"/chat/{room_id}#{message.id}"
                )

        return {
            'success': True,
            'message': asdict(message)
        }

    def get_messages(
        self,
        room_id: str,
        limit: int = 50,
        before: Optional[str] = None
    ) -> Dict:
        """Get messages from a room"""
        if room_id not in self.rooms:
            return {'success': False, 'error': 'Room not found'}

        # Filter messages by room
        room_messages = [
            msg for msg in self.messages.values()
            if msg.room_id == room_id and not msg.is_deleted
        ]

        # Sort by created_at
        room_messages = sorted(room_messages, key=lambda x: x.created_at, reverse=True)

        # Apply before filter
        if before:
            room_messages = [m for m in room_messages if m.created_at < before]

        # Limit
        room_messages = room_messages[:limit]

        return {
            'success': True,
            'messages': [asdict(m) for m in room_messages],
            'count': len(room_messages)
        }

    def add_reaction(
        self,
        message_id: str,
        user_id: str,
        emoji: str
    ) -> Dict:
        """Add reaction to message"""
        if message_id not in self.messages:
            return {'success': False, 'error': 'Message not found'}

        message = self.messages[message_id]

        if emoji not in message.reactions:
            message.reactions[emoji] = []

        if user_id not in message.reactions[emoji]:
            message.reactions[emoji].append(user_id)
            self._save_messages()

            # Create notification
            if user_id != message.user_id:
                self._create_notification(
                    user_id=message.user_id,
                    notification_type=NotificationType.REACTION.value,
                    title="New reaction",
                    message=f"Someone reacted {emoji} to your message",
                    link=f"/chat/{message.room_id}#{message_id}"
                )

        return {
            'success': True,
            'reactions': message.reactions
        }

    # ============================================================================
    # ACTIVITIES
    # ============================================================================

    def _create_activity(
        self,
        activity_type: str,
        user_id: str,
        username: str,
        description: str,
        room_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ):
        """Create an activity event"""
        activity = Activity(
            id=str(uuid.uuid4()),
            activity_type=activity_type,
            user_id=user_id,
            username=username,
            description=description,
            metadata=metadata or {},
            room_id=room_id,
            created_at=datetime.now().isoformat()
        )

        self.activities.append(activity)

        # Keep only last 1000 activities
        if len(self.activities) > 1000:
            self.activities = self.activities[-1000:]

        self._save_activities()

    def get_activities(
        self,
        room_id: Optional[str] = None,
        limit: int = 50
    ) -> Dict:
        """Get activity feed"""
        activities = self.activities

        if room_id:
            activities = [a for a in activities if a.room_id == room_id]

        # Sort by created_at descending
        activities = sorted(activities, key=lambda x: x.created_at, reverse=True)
        activities = activities[:limit]

        return {
            'success': True,
            'activities': [asdict(a) for a in activities],
            'count': len(activities)
        }

    # ============================================================================
    # NOTIFICATIONS
    # ============================================================================

    def _create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        metadata: Optional[Dict] = None
    ):
        """Create a notification"""
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
            is_read=False,
            metadata=metadata or {},
            created_at=datetime.now().isoformat()
        )

        self.notifications[notification.id] = notification
        self._save_notifications()

    def get_notifications(
        self,
        user_id: str,
        unread_only: bool = False
    ) -> Dict:
        """Get user notifications"""
        user_notifications = [
            notif for notif in self.notifications.values()
            if notif.user_id == user_id
        ]

        if unread_only:
            user_notifications = [n for n in user_notifications if not n.is_read]

        # Sort by created_at descending
        user_notifications = sorted(
            user_notifications,
            key=lambda x: x.created_at,
            reverse=True
        )

        return {
            'success': True,
            'notifications': [asdict(n) for n in user_notifications],
            'count': len(user_notifications),
            'unread_count': len([n for n in user_notifications if not n.is_read])
        }

    def mark_notification_read(self, notification_id: str) -> Dict:
        """Mark notification as read"""
        if notification_id not in self.notifications:
            return {'success': False, 'error': 'Notification not found'}

        notification = self.notifications[notification_id]
        notification.is_read = True
        self._save_notifications()

        return {'success': True}

    # ============================================================================
    # COLLABORATIVE SESSIONS
    # ============================================================================

    def create_session(
        self,
        name: str,
        resource_type: str,
        resource_id: str,
        created_by: str
    ) -> Dict:
        """Create collaborative session"""
        session = CollaborativeSession(
            id=str(uuid.uuid4()),
            name=name,
            resource_type=resource_type,
            resource_id=resource_id,
            participants=[created_by],
            created_by=created_by,
            created_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True,
            cursors={},
            locks={}
        )

        self.sessions[session.id] = session
        self._save_sessions()

        return {
            'success': True,
            'session': asdict(session)
        }

    def join_session(self, session_id: str, user_id: str) -> Dict:
        """Join collaborative session"""
        if session_id not in self.sessions:
            return {'success': False, 'error': 'Session not found'}

        session = self.sessions[session_id]
        if user_id not in session.participants:
            session.participants.append(user_id)
            session.last_activity = datetime.now().isoformat()
            self._save_sessions()

        return {
            'success': True,
            'session': asdict(session)
        }

    def update_cursor(
        self,
        session_id: str,
        user_id: str,
        cursor_data: Dict[str, Any]
    ) -> Dict:
        """Update user cursor position"""
        if session_id not in self.sessions:
            return {'success': False, 'error': 'Session not found'}

        session = self.sessions[session_id]
        session.cursors[user_id] = cursor_data
        session.last_activity = datetime.now().isoformat()
        self._save_sessions()

        return {'success': True}

    def get_statistics(self) -> Dict:
        """Get collaboration statistics"""
        online_users = len([
            p for p in self.presence.values()
            if p.status == PresenceStatus.ONLINE.value
        ])

        total_messages = len(self.messages)
        active_rooms = len([r for r in self.rooms.values() if r.message_count > 0])
        active_sessions = len([s for s in self.sessions.values() if s.is_active])

        return {
            'success': True,
            'statistics': {
                'online_users': online_users,
                'total_rooms': len(self.rooms),
                'active_rooms': active_rooms,
                'total_messages': total_messages,
                'active_sessions': active_sessions,
                'total_activities': len(self.activities),
                'unread_notifications': len([
                    n for n in self.notifications.values() if not n.is_read
                ])
            }
        }


# Singleton instance
realtime_manager = RealtimeCollaborationManager()
