"""
SQLite database for download history and metadata tracking.
"""
import sqlite3
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class Database:
    """Simple SQLite database for tracking downloads and metadata."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _init_db(self):
        """Initialize database with required tables."""
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row  # Enable dict-like access

        cursor = self.conn.cursor()

        # Downloads table - track all downloaded files
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                chat_id INTEGER NOT NULL,
                chat_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                media_type TEXT,
                download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'completed',
                UNIQUE(message_id, chat_id)
            )
        ''')

        # Progress table - track download sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                chat_id INTEGER,
                chat_name TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                status TEXT DEFAULT 'running',
                downloaded_count INTEGER DEFAULT 0,
                skipped_count INTEGER DEFAULT 0
            )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_downloads_chat ON downloads(chat_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)')

        self.conn.commit()
        logger.info(f"Database initialized at {self.db_path}")

    def is_downloaded(self, message_id: int, chat_id: int) -> bool:
        """Check if a file has already been downloaded."""
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT 1 FROM downloads WHERE message_id = ? AND chat_id = ? AND status = "completed"',
            (message_id, chat_id)
        )
        return cursor.fetchone() is not None

    def add_download(self, message_id: int, chat_id: int, chat_name: str,
                     file_path: str, file_size: int = 0, media_type: str = 'unknown') -> bool:
        """Record a successful download."""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO downloads
                (message_id, chat_id, chat_name, file_path, file_size, media_type, status)
                VALUES (?, ?, ?, ?, ?, ?, 'completed')
            ''', (message_id, chat_id, chat_name, file_path, file_size, media_type))
            self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to add download record: {e}")
            return False

    def start_session(self, session_id: str, chat_id: Optional[int] = None,
                     chat_name: Optional[str] = None) -> int:
        """Start a new download session."""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO sessions (session_id, chat_id, chat_name, status)
            VALUES (?, ?, ?, 'running')
        ''', (session_id, chat_id, chat_name))
        self.conn.commit()
        return cursor.lastrowid

    def update_session_progress(self, session_id: str, downloaded: int, skipped: int):
        """Update session progress counters."""
        cursor = self.conn.cursor()
        cursor.execute('''
            UPDATE sessions
            SET downloaded_count = ?, skipped_count = ?
            WHERE session_id = ?
        ''', (downloaded, skipped, session_id))
        self.conn.commit()

    def end_session(self, session_id: str, status: str = 'completed'):
        """Mark a session as completed."""
        cursor = self.conn.cursor()
        cursor.execute('''
            UPDATE sessions
            SET status = ?, completed_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
        ''', (status, session_id))
        self.conn.commit()

    def get_download_stats(self, chat_id: Optional[int] = None) -> Dict[str, Any]:
        """Get download statistics."""
        cursor = self.conn.cursor()

        if chat_id:
            cursor.execute('''
                SELECT COUNT(*) as total, SUM(file_size) as total_size
                FROM downloads WHERE chat_id = ? AND status = 'completed'
            ''', (chat_id,))
        else:
            cursor.execute('''
                SELECT COUNT(*) as total, SUM(file_size) as total_size
                FROM downloads WHERE status = 'completed'
            ''')

        row = cursor.fetchone()
        return {
            'total_downloads': row['total'] or 0,
            'total_size_bytes': row['total_size'] or 0
        }

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
