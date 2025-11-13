"""
HTML Export - Convert downloaded chats to browsable HTML archives
"""
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import base64


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{chat_name} - Telegram Archive</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e4e4e4; }}
        .container {{ max-width: 900px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #1a1a1a; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #2a2a2a; }}
        .header h1 {{ font-size: 24px; margin-bottom: 10px; color: #fff; }}
        .header .meta {{ color: #888; font-size: 14px; }}
        .filters {{ background: #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #2a2a2a; }}
        .filters input {{ background: #2a2a2a; border: 1px solid #3a3a3a; padding: 8px 12px; border-radius: 6px; color: #fff; width: 100%; font-size: 14px; }}
        .message {{ background: #1a1a1a; padding: 15px; margin-bottom: 15px; border-radius: 12px; border: 1px solid #2a2a2a; transition: border-color 0.2s; }}
        .message:hover {{ border-color: #0088cc; }}
        .message .date {{ color: #0088cc; font-size: 12px; margin-bottom: 8px; }}
        .message .content {{ color: #e4e4e4; line-height: 1.6; }}
        .message .media {{ margin-top: 10px; }}
        .message .media img {{ max-width: 100%; border-radius: 8px; cursor: pointer; }}
        .message .media video {{ max-width: 100%; border-radius: 8px; }}
        .stats {{ display: flex; gap: 20px; margin-bottom: 20px; }}
        .stat-card {{ flex: 1; background: #1a1a1a; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #2a2a2a; }}
        .stat-card .number {{ font-size: 24px; font-weight: bold; color: #0088cc; }}
        .stat-card .label {{ font-size: 12px; color: #888; margin-top: 5px; }}
        .lightbox {{ display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }}
        .lightbox img {{ margin: auto; display: block; max-width: 90%; max-height: 90%; margin-top: 50px; }}
        .close {{ position: absolute; top: 30px; right: 45px; color: #fff; font-size: 40px; cursor: pointer; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{chat_name}</h1>
            <div class="meta">Telegram Arşiv Dışa Aktarımı - {export_date}</div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="number">{total_messages}</div>
                <div class="label">Toplam Mesaj</div>
            </div>
            <div class="stat-card">
                <div class="number">{total_media}</div>
                <div class="label">Medya Dosyası</div>
            </div>
            <div class="stat-card">
                <div class="number">{total_size}</div>
                <div class="label">Toplam Boyut</div>
            </div>
        </div>

        <div class="filters">
            <input type="text" id="search" placeholder="Ara..." oninput="filterMessages(this.value)">
        </div>

        <div id="messages">
            {messages_html}
        </div>
    </div>

    <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <span class="close">&times;</span>
        <img id="lightbox-img" src="">
    </div>

    <script>
        function filterMessages(query) {{
            const messages = document.querySelectorAll('.message');
            const lowerQuery = query.toLowerCase();
            messages.forEach(msg => {{
                const text = msg.textContent.toLowerCase();
                msg.style.display = text.includes(lowerQuery) ? 'block' : 'none';
            }});
        }}

        function openLightbox(src) {{
            document.getElementById('lightbox').style.display = 'block';
            document.getElementById('lightbox-img').src = src;
        }}

        function closeLightbox() {{
            document.getElementById('lightbox').style.display = 'none';
        }}

        document.addEventListener('keydown', (e) => {{
            if (e.key === 'Escape') closeLightbox();
        }});
    </script>
</body>
</html>
"""


def format_file_size(bytes_size: int) -> str:
    """Format bytes to human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} PB"


def generate_message_html(message: Dict[str, Any], media_folder: Path) -> str:
    """Generate HTML for a single message."""
    date_str = message.get('date', '')
    content = message.get('content', '')
    media_path = message.get('media_path', '')

    media_html = ""
    if media_path and Path(media_path).exists():
        rel_path = Path(media_path).name
        if media_path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            media_html = f'<div class="media"><img src="{rel_path}" onclick="openLightbox(this.src)" alt="Image"></div>'
        elif media_path.lower().endswith(('.mp4', '.webm', '.mov')):
            media_html = f'<div class="media"><video controls><source src="{rel_path}"></video></div>'
        else:
            media_html = f'<div class="media"><a href="{rel_path}" download>📎 {rel_path}</a></div>'

    return f"""
    <div class="message">
        <div class="date">{date_str}</div>
        <div class="content">{content}</div>
        {media_html}
    </div>
    """


async def export_chat_to_html(
    chat_name: str,
    messages: List[Dict[str, Any]],
    output_path: Path,
    media_folder: Path
) -> Path:
    """Export a chat to browsable HTML format."""

    # Generate statistics
    total_messages = len(messages)
    total_media = sum(1 for m in messages if m.get('media_path'))

    # Calculate total size from database if available
    total_size_bytes = sum(m.get('file_size', 0) for m in messages)
    total_size = format_file_size(total_size_bytes)

    # Generate messages HTML
    messages_html = '\n'.join(
        generate_message_html(msg, media_folder)
        for msg in messages
    )

    # Fill template
    html_content = HTML_TEMPLATE.format(
        chat_name=chat_name,
        export_date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        total_messages=total_messages,
        total_media=total_media,
        total_size=total_size,
        messages_html=messages_html
    )

    # Write HTML file
    html_file = output_path / f"{chat_name}_archive.html"
    html_file.write_text(html_content, encoding='utf-8')

    return html_file


async def export_all_chats_to_html(output_base: Path, db) -> List[Path]:
    """Export all chats to HTML format."""
    html_files = []

    # Get all chats from database
    cursor = db.conn.cursor()
    cursor.execute('SELECT DISTINCT chat_name, chat_id FROM downloads ORDER BY chat_name')
    chats = cursor.fetchall()

    for chat in chats:
        chat_name = chat['chat_name']
        chat_id = chat['chat_id']

        # Get all messages for this chat
        cursor.execute('''
            SELECT message_id, file_path, file_size, media_type, download_date
            FROM downloads
            WHERE chat_id = ?
            ORDER BY message_id
        ''', (chat_id,))

        messages = []
        for row in cursor.fetchall():
            messages.append({
                'date': row['download_date'],
                'content': f"Message ID: {row['message_id']}",
                'media_path': row['file_path'],
                'file_size': row['file_size'],
                'media_type': row['media_type']
            })

        if messages:
            media_folder = output_base / chat_name
            html_file = await export_chat_to_html(
                chat_name,
                messages,
                output_base,
                media_folder
            )
            html_files.append(html_file)

    return html_files
