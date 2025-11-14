import asyncio
import json
import time
import base64
import logging
import os
from collections import deque
from pathlib import Path
from typing import List, Optional, Set

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from telethon import TelegramClient, types as tl_types
try:
    from . import contacts
    from .database import Database
    from .account_manager import AccountManager
    from .cloud_sync import CloudSyncConfig, CloudSyncManager
    from .ai_classifier import AIClassifierConfig, AIClassificationManager
    from .scheduler import TaskScheduler, ScheduledTask, ScheduleType
    from .clip_classifier import CLIPClassifier
    from .duplicate_detector import DuplicateDetector
    from .webhook_manager import WebhookManager, WEBHOOK_EVENTS
    from .video_processor import VideoProcessor
    from .ipfs_storage import IPFSStorage
    from .plugin_system import PluginManager, PluginHook
    from .i18n_manager import I18nManager
    from .rbac_system import RBACManager, Permission, Role, User, Organization
    from .content_moderator import ContentModerator, ModerationAction, ContentCategory
except ImportError:
    import contacts
    from database import Database
    from account_manager import AccountManager
    from cloud_sync import CloudSyncConfig, CloudSyncManager
    from ai_classifier import AIClassifierConfig, AIClassificationManager
    from scheduler import TaskScheduler, ScheduledTask, ScheduleType
    from clip_classifier import CLIPClassifier
    from duplicate_detector import DuplicateDetector
    from webhook_manager import WebhookManager, WEBHOOK_EVENTS
    from video_processor import VideoProcessor
    from ipfs_storage import IPFSStorage
    from plugin_system import PluginManager, PluginHook
    from i18n_manager import I18nManager
    from rbac_system import RBACManager, Permission, Role, User, Organization
    from content_moderator import ContentModerator, ModerationAction, ContentCategory

# Load environment variables
load_dotenv(Path(__file__).resolve().parent / ".env")

APP = FastAPI()

# CORS configuration - restrict origins for security
# Can be overridden via ALLOWED_ORIGINS environment variable
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

APP.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Add GZip compression for responses > 1KB (performance optimization)
APP.add_middleware(GZipMiddleware, minimum_size=1000)

ROOT = Path(__file__).resolve().parent
CFG_FILE = ROOT / "config.json"
LOG_DIR = ROOT.parent / "log"
LOG_DIR.mkdir(exist_ok=True)
DB_FILE = ROOT / "downloads.db"
ACCOUNTS_FILE = ROOT / "accounts.json"
CLOUD_SYNC_FILE = ROOT / "cloud_sync.json"
AI_CLASSIFIER_FILE = ROOT / "ai_classifier.json"
SCHEDULED_TASKS_FILE = ROOT / "scheduled_tasks.json"
WEBHOOKS_FILE = ROOT / "webhooks.json"
PLUGINS_DIR = ROOT.parent / "plugins"
PLUGINS_DIR.mkdir(exist_ok=True)
TRANSLATIONS_DIR = ROOT.parent / "translations"
TRANSLATIONS_DIR.mkdir(exist_ok=True)
RBAC_FILE = ROOT / "rbac_data.json"
MODERATION_FILE = ROOT / "moderation_config.json"

# Initialize database
db = Database(DB_FILE)

# Initialize account manager
account_manager = AccountManager(ACCOUNTS_FILE)

# Initialize cloud sync
cloud_sync_config = CloudSyncConfig(CLOUD_SYNC_FILE)
cloud_sync_manager = CloudSyncManager(cloud_sync_config)

# Initialize AI classifier
ai_classifier_config = AIClassifierConfig(AI_CLASSIFIER_FILE)
ai_classification_manager = AIClassificationManager(ai_classifier_config, db)

# Initialize task scheduler
task_scheduler = TaskScheduler(SCHEDULED_TASKS_FILE)

# Initialize CLIP classifier
clip_classifier = CLIPClassifier(model_name="ViT-B/32", device="cpu")

# Initialize duplicate detector
duplicate_detector = DuplicateDetector(db)

# Initialize webhook manager
webhook_manager = WebhookManager(WEBHOOKS_FILE)

# Initialize video processor
video_processor = VideoProcessor()

# Initialize IPFS storage
ipfs_storage = IPFSStorage(
    ipfs_api_url=os.getenv("IPFS_API_URL", "http://localhost:5001"),
    enable_filecoin=os.getenv("ENABLE_FILECOIN", "false").lower() == "true"
)

# Initialize plugin manager
plugin_manager = PluginManager(PLUGINS_DIR)

# Initialize i18n manager
i18n_manager = I18nManager(TRANSLATIONS_DIR)

# Initialize RBAC manager
rbac_manager = RBACManager(RBAC_FILE)

# Initialize content moderator
content_moderator = ContentModerator(MODERATION_FILE)

# Configure logging with environment variable support
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / "telegramsaver.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@APP.on_event("startup")
async def startup_event():
    """Initialize scheduler on app startup."""
    logger.info("Starting scheduled task scheduler...")
    # Start scheduler with download worker callback
    async def scheduled_download_callback(chats, media_types):
        cfg = load_cfg()
        await download_worker(cfg, chats=chats, media_types=media_types)

    task_scheduler.start(scheduled_download_callback)


@APP.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler on app shutdown."""
    logger.info("Stopping scheduled task scheduler...")
    task_scheduler.stop()


class Config(BaseModel):
    api_id: int = 0
    api_hash: str = ""
    session: str = "tg_media"
    out: str = str(Path.home() / "TelegramArchive")  # Platform-agnostic default path
    types: List[str] = ["photos"]
    include: List[str] = []
    exclude: List[str] = []
    chats: List[str] = []
    min_date: str = ""
    max_date: str = ""
    throttle: float = 0.2
    concurrency: int = 3
    dry_run: bool = False


STATE = {
    "running": False,
    "log": deque(maxlen=500),  # Use deque with maxlen to prevent memory leak
    # Track current chat name, number of downloaded files and skipped messages
    "progress": {"chat": "", "downloaded": 0, "skipped": 0},
    "stop": asyncio.Event(),  # Use asyncio.Event instead of threading.Event
    "worker": None,
    "config": None,
    "websocket_clients": set(),  # WebSocket connections for real-time updates
    "cache": {},  # Simple in-memory cache for API responses
    "cache_ttl": {},  # Cache TTL timestamps
}


def log(msg: str) -> None:
    """Log message to both file/console and in-memory buffer."""
    logger.info(msg)
    STATE["log"].append(msg)  # deque automatically removes old items when maxlen is reached


def cache_get(key: str, ttl: int = 60):
    """Get cached value if not expired."""
    if key in STATE["cache"]:
        cache_time = STATE["cache_ttl"].get(key, 0)
        if time.time() - cache_time < ttl:
            return STATE["cache"][key]
        else:
            # Expired, remove from cache
            del STATE["cache"][key]
            del STATE["cache_ttl"][key]
    return None


def cache_set(key: str, value):
    """Set cached value with timestamp."""
    STATE["cache"][key] = value
    STATE["cache_ttl"][key] = time.time()


@APP.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Performance monitoring middleware with detailed timing."""
    start = time.perf_counter()
    start_memory = 0
    try:
        # Get memory usage if available (optional)
        import psutil
        process = psutil.Process()
        start_memory = process.memory_info().rss / 1024 / 1024  # MB
    except ImportError:
        pass

    try:
        response = await call_next(request)
    except Exception:
        duration = time.perf_counter() - start
        log(f"{request.method} {request.url.path} failed in {duration:.4f}s")
        raise

    duration = time.perf_counter() - start

    # Add performance headers
    response.headers["X-Process-Time"] = f"{duration:.4f}"

    # Log slow requests (> 1 second)
    if duration > 1.0:
        log(f"[slow] {request.method} {request.url.path} took {duration:.4f}s")
    else:
        log(f"{request.method} {request.url.path} completed in {duration:.4f}s")

    return response


@APP.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with environment-aware error details."""
    log(f"[error] {exc}")

    # In development, show detailed error; in production, hide sensitive info
    is_dev = os.getenv("ENVIRONMENT", "production").lower() in ("development", "dev")
    detail = str(exc) if is_dev else "Internal Server Error"

    return JSONResponse(
        status_code=500,
        content={
            "detail": detail,
            "error_type": type(exc).__name__ if is_dev else "ServerError"
        }
    )


def load_cfg() -> Config:
    if CFG_FILE.exists():
        try:
            data = json.loads(CFG_FILE.read_text("utf-8"))
        except Exception as exc:
            log(f"[error] failed to load config: {exc}")
            raise HTTPException(status_code=500, detail="Failed to load config") from exc
    else:
        data = {}

    # Merge active account credentials if available (takes precedence)
    active_account = account_manager.get_active_account()
    if active_account:
        data["api_id"] = active_account.api_id
        data["api_hash"] = active_account.api_hash
        data["session"] = active_account.session

    cfg = Config(**data)
    STATE["config"] = cfg
    return cfg


def save_cfg(cfg: Config) -> None:
    if hasattr(cfg, "model_dump_json"):
        CFG_FILE.write_text(cfg.model_dump_json(indent=2), encoding="utf-8")
    else:  # pragma: no cover - fallback for Pydantic v1
        CFG_FILE.write_text(cfg.json(indent=2), encoding="utf-8")
    STATE["config"] = cfg


@APP.get("/api/config")
def get_config():
    cfg = load_cfg()
    return cfg.model_dump() if hasattr(cfg, "model_dump") else cfg.dict()  # pragma: no cover


@APP.post("/api/config")
def set_config(payload: dict):
    cfg = Config(**payload)
    save_cfg(cfg)
    return {"ok": True}


@APP.get("/api/dialogs")
async def list_dialogs():
    """Return joined groups/channels with basic info and media counts."""
    cfg = load_cfg()
    client = TelegramClient(cfg.session, cfg.api_id, cfg.api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        await client.disconnect()
        raise HTTPException(status_code=401, detail="Telegram oturumu yetkili değil")
    items = []
    media_failures = []
    photo_failures = []
    async for d in client.iter_dialogs():
        entity = getattr(d, "entity", None)
        if not getattr(d, "is_group", False) and not getattr(d, "is_channel", False):
            continue
        name = (
            getattr(d, "name", None)
            or getattr(entity, "username", None)
            or str(getattr(d, "id", ""))
        )
        username = getattr(entity, "username", None)
        counts = {"photos": 0, "videos": 0, "documents": 0}
        try:
            photos = await client.get_messages(
                entity or d.id, limit=0, filter=tl_types.InputMessagesFilterPhotos()
            )
            videos = await client.get_messages(
                entity or d.id, limit=0, filter=tl_types.InputMessagesFilterVideo()
            )
            documents = await client.get_messages(
                entity or d.id, limit=0, filter=tl_types.InputMessagesFilterDocument()
            )
            counts = {
                "photos": getattr(photos, "total", 0),
                "videos": getattr(videos, "total", 0),
                "documents": getattr(documents, "total", 0),
            }
        except Exception as exc:
            media_failures.append(name)
            log(f"[warn] media count failed for {name}: {exc}")
        photo_data = None
        try:
            raw = await client.download_profile_photo(entity or d.id, file=bytes)
            if raw:
                photo_data = "data:image/jpeg;base64," + base64.b64encode(raw).decode()
        except Exception as exc:
            photo_failures.append(name)
            log(f"[warn] profile photo download failed for {name}: {exc}")
        items.append(
            {
                "id": getattr(d, "id", None),
                "name": name,
                "username": username,
                "photo": photo_data,
                "counts": counts,
            }
        )
    if media_failures:
        log(
            "[warn] media counts skipped for: "
            + ", ".join(sorted(set(media_failures)))
        )
    if photo_failures:
        log(
            "[warn] profile photos skipped for: "
            + ", ".join(sorted(set(photo_failures)))
        )
    await client.disconnect()
    return items


@APP.get("/api/contacts")
async def list_contacts():
    """Return contacts of users from joined chats."""
    cfg = load_cfg()
    try:
        cfg_dict = cfg.model_dump() if hasattr(cfg, "model_dump") else cfg.dict()
        data = await contacts.list_contacts(cfg_dict, {})
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    return data.get("items", [])


def make_media_filter(types_list: Optional[List[str]]):
    tset = set(types_list or [])
    if tset == {"photos"}:
        return tl_types.InputMessagesFilterPhotos()
    if tset == {"videos"}:
        return tl_types.InputMessagesFilterVideo()
    if tset == {"documents"}:
        return tl_types.InputMessagesFilterDocument()
    if tset <= {"photos", "videos"} and tset:
        return tl_types.InputMessagesFilterPhotoVideo()
    return None


async def download_file(client: TelegramClient, msg, target_dir: Path,
                       chat_id: int = 0, chat_name: str = "") -> tuple[Path, int]:
    """Download a file and return (path, size)."""
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = getattr(getattr(msg, "file", None), "name", None)
    if not filename and getattr(msg, "document", None):
        for attr in getattr(msg.document, "attributes", []):
            if getattr(attr, "file_name", None):
                filename = attr.file_name
                break
    filename = filename or f"{msg.id}"
    final = target_dir / filename
    temp = final.with_suffix(final.suffix + ".part")
    offset = temp.stat().st_size if temp.exists() else 0
    mode = "ab" if offset else "wb"
    with open(temp, mode) as f:
        await client.download_file(
            getattr(msg, "media", None) or msg, f, offset=offset
        )
    temp.replace(final)
    file_size = final.stat().st_size if final.exists() else 0
    return final, file_size


async def download_worker(
    cfg: Config,
    chats: Optional[List[str]] = None,
    media_types: Optional[List[str]] = None,
):
    client = TelegramClient(cfg.session, cfg.api_id, cfg.api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        raise PermissionError("Telegram oturumu yetkili değil")

    media_types = media_types or cfg.types
    out_base = Path(cfg.out or str(Path.home() / "TelegramArchive"))
    out_base.mkdir(parents=True, exist_ok=True)
    # reset progress counters for a new run
    STATE["progress"] = {"chat": "", "downloaded": 0, "skipped": 0}

    # Start database session
    import uuid
    session_id = str(uuid.uuid4())
    db.start_session(session_id)

    sem = asyncio.Semaphore(cfg.concurrency)
    chosen = set(str(x) for x in (chats or cfg.chats or []))
    flt = make_media_filter(media_types)
    tasks = []
    stop_event = STATE["stop"]

    try:
        async for dialog in client.iter_dialogs():
            if stop_event.is_set():
                break
            name = (
                getattr(dialog, "name", None)
                or getattr(getattr(dialog, "entity", None), "username", None)
                or str(getattr(dialog, "id", ""))
            )
            if chosen and (
                name not in chosen and str(getattr(dialog, "id", "")) not in chosen
            ):
                continue
            # record current chat being processed
            STATE["progress"]["chat"] = name
            chat_dir = out_base / name
            tasks = []
            async for msg in client.iter_messages(dialog, reverse=True, filter=flt):
                if stop_event.is_set():
                    break
                kind = None
                if "photos" in media_types and getattr(msg, "photo", None):
                    kind = "photos"
                elif "videos" in media_types and getattr(msg, "video", None):
                    kind = "videos"
                elif "documents" in media_types and getattr(msg, "document", None):
                    kind = "documents"
                else:
                    # ignored message does not match requested media types
                    STATE["progress"]["skipped"] += 1
                    continue
                target_dir = chat_dir / kind / str(msg.date.year)

                # Skip if already downloaded (incremental backup)
                chat_id = getattr(dialog, "id", 0)
                if db.is_downloaded(msg.id, chat_id):
                    STATE["progress"]["skipped"] += 1
                    continue

                async def runner(m=msg, dname=name, tdir=target_dir, cid=chat_id, knd=kind):
                    async with sem:
                        for attempt in range(3):
                            try:
                                file_path, file_size = await download_file(client, m, tdir, cid, dname)
                                # Record successful download in database
                                db.add_download(m.id, cid, dname, str(file_path), file_size, knd)
                                STATE["progress"]["downloaded"] += 1
                                db.update_session_progress(session_id,
                                    STATE["progress"]["downloaded"],
                                    STATE["progress"]["skipped"])
                                # Broadcast progress to WebSocket clients
                                await broadcast_progress()
                                return True
                            except Exception as exc:
                                if attempt == 2:
                                    log(f"[error] download failed for {dname}: {exc}")
                                    return False
                                await asyncio.sleep(cfg.throttle)

                tasks.append(asyncio.create_task(runner()))
                if len(tasks) >= cfg.concurrency:
                    await asyncio.gather(*tasks)
                    tasks.clear()
                if stop_event.is_set():
                    break

            if tasks:
                if stop_event.is_set():
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)
                else:
                    await asyncio.gather(*tasks)
                tasks.clear()
            if stop_event.is_set():
                break

        # ensure no leftover tasks when loop exits
        if tasks:
            await asyncio.gather(*tasks)
    finally:
        db.end_session(session_id, "completed" if not stop_event.is_set() else "stopped")
        await client.disconnect()
        log("[*] Worker bitti.")


def run_worker_sync(
    cfg: Config, chats: Optional[List[str]] = None, media_types: Optional[List[str]] = None
):
    STATE["stop"].clear()
    STATE["running"] = True
    try:
        asyncio.run(download_worker(cfg, chats=chats, media_types=media_types))
    finally:
        STATE["running"] = False


async def run_worker_async(cfg: Config, chats=None, media_types=None):
    STATE["stop"].clear()
    STATE["running"] = True
    try:
        await download_worker(cfg, chats=chats, media_types=media_types)
    finally:
        STATE["running"] = False


@APP.post("/api/start")
def start(background_tasks: BackgroundTasks, payload: Optional[dict] = None):
    if STATE["running"]:
        return {"ok": True, "already": True}
    cfg = load_cfg()
    if not cfg.api_id or not cfg.api_hash:
        raise HTTPException(status_code=400, detail="API ID/HASH zorunlu")
    chats = (payload or {}).get("chats")
    media_types = (payload or {}).get("media_types")
    background_tasks.add_task(run_worker_sync, cfg, chats, media_types)
    return {"ok": True}


def request_stop():
    STATE["stop"].set()


@APP.post("/api/stop")
async def stop(background_tasks: BackgroundTasks):
    background_tasks.add_task(request_stop)
    return {"ok": True}


@APP.post("/api/export/html")
async def export_to_html():
    """Export all downloaded chats to browsable HTML format."""
    try:
        from .html_export import export_all_chats_to_html
    except ImportError:
        from html_export import export_all_chats_to_html

    cfg = load_cfg()
    output_path = Path(cfg.out or str(Path.home() / "TelegramArchive"))

    # Generate HTML exports for all chats
    html_files = await export_all_chats_to_html(output_path, db)

    log(f"[*] HTML export completed: {len(html_files)} files generated")

    return {
        "ok": True,
        "files": [str(f) for f in html_files],
        "count": len(html_files)
    }


@APP.get("/api/status")
def status():
    tail = list(STATE["log"])[-50:]  # Convert deque to list before slicing
    return {"running": STATE["running"], "progress": STATE.get("progress"), "logTail": tail}


# Account Management Endpoints

@APP.get("/api/accounts")
def list_accounts():
    """List all configured accounts."""
    accounts = account_manager.list_accounts()
    return {
        "ok": True,
        "accounts": [acc.model_dump() for acc in accounts]
    }


@APP.post("/api/accounts")
def add_account(payload: dict):
    """Add a new Telegram account."""
    import uuid
    account_id = payload.get("id") or str(uuid.uuid4())
    name = payload.get("name")
    api_id = payload.get("api_id")
    api_hash = payload.get("api_hash")
    phone = payload.get("phone")

    if not all([name, api_id, api_hash]):
        raise HTTPException(status_code=400, detail="Name, API ID and API Hash are required")

    try:
        account = account_manager.add_account(account_id, name, int(api_id), api_hash, phone)
        log(f"[*] Added account: {name}")
        return {"ok": True, "account": account.model_dump()}
    except Exception as e:
        log(f"[error] Failed to add account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/accounts/{account_id}")
def remove_account(account_id: str):
    """Remove an account."""
    success = account_manager.remove_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    log(f"[*] Removed account: {account_id}")
    return {"ok": True}


@APP.post("/api/accounts/{account_id}/activate")
def activate_account(account_id: str):
    """Switch to a different account."""
    success = account_manager.switch_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    account = account_manager.get_account(account_id)
    log(f"[*] Switched to account: {account.name}")
    return {"ok": True, "account": account.model_dump()}


@APP.get("/api/accounts/active")
def get_active_account():
    """Get the currently active account."""
    account = account_manager.get_active_account()
    if not account:
        return {"ok": True, "account": None}
    return {"ok": True, "account": account.model_dump()}


# Cloud Sync Endpoints

@APP.get("/api/cloud-sync/config")
def get_cloud_sync_config():
    """Get current cloud sync configuration."""
    return {
        "ok": True,
        "provider": cloud_sync_config.provider.value,
        "auto_sync": cloud_sync_config.auto_sync,
        "remote_folder": cloud_sync_config.remote_folder,
        "has_credentials": bool(cloud_sync_config.credentials)
    }


@APP.post("/api/cloud-sync/config")
def set_cloud_sync_config(payload: dict):
    """Configure cloud sync settings."""
    try:
        provider = payload.get("provider", "disabled")
        auto_sync = payload.get("auto_sync", False)
        credentials = payload.get("credentials")
        remote_folder = payload.get("remote_folder")

        cloud_sync_config.configure(
            provider=provider,
            auto_sync=auto_sync,
            credentials=credentials,
            remote_folder=remote_folder
        )

        log(f"[*] Cloud sync configured: {provider}")
        return {"ok": True}
    except Exception as e:
        log(f"[error] Failed to configure cloud sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/cloud-sync/sync")
async def manual_sync():
    """Manually trigger cloud sync for all downloaded files."""
    if cloud_sync_config.provider.value == "disabled":
        raise HTTPException(status_code=400, detail="Cloud sync is not configured")

    cfg = load_cfg()
    output_path = Path(cfg.out or str(Path.home() / "TelegramArchive"))

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="No downloads folder found")

    try:
        result = await cloud_sync_manager.sync_folder(output_path)
        if result.get("ok"):
            log(f"[*] Cloud sync completed: {result.get('uploaded')} files")
        return result
    except Exception as e:
        log(f"[error] Cloud sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI Classification Endpoints

@APP.get("/api/ai-classify/config")
def get_ai_classifier_config():
    """Get AI classification configuration."""
    return {
        "ok": True,
        "enabled": ai_classifier_config.enabled,
        "model": ai_classifier_config.model.value,
        "auto_classify": ai_classifier_config.auto_classify,
        "confidence_threshold": ai_classifier_config.confidence_threshold,
        "categories": ai_classifier_config.categories
    }


@APP.post("/api/ai-classify/config")
def set_ai_classifier_config(payload: dict):
    """Configure AI classification settings."""
    try:
        ai_classifier_config.enabled = payload.get("enabled", ai_classifier_config.enabled)
        ai_classifier_config.model = payload.get("model", ai_classifier_config.model)
        ai_classifier_config.auto_classify = payload.get("auto_classify", ai_classifier_config.auto_classify)
        ai_classifier_config.confidence_threshold = payload.get("confidence_threshold", ai_classifier_config.confidence_threshold)
        if "categories" in payload:
            ai_classifier_config.categories = payload["categories"]

        ai_classifier_config.save_config()
        log(f"[*] AI classifier configured: {ai_classifier_config.model}")
        return {"ok": True}
    except Exception as e:
        log(f"[error] Failed to configure AI classifier: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ai-classify/classify")
async def classify_downloads():
    """Classify all downloaded media files."""
    if not ai_classifier_config.enabled:
        raise HTTPException(status_code=400, detail="AI classification is not enabled")

    cfg = load_cfg()
    output_path = Path(cfg.out or str(Path.home() / "TelegramArchive"))

    if not output_path.exists():
        raise HTTPException(status_code=404, detail="No downloads folder found")

    try:
        await ai_classification_manager.initialize()
        result = await ai_classification_manager.classify_folder(output_path)

        if result.get("ok"):
            stats = result.get("stats", {})
            log(f"[*] Classification completed: {stats.get('classified')}/{stats.get('total')} files")

        return result
    except Exception as e:
        log(f"[error] Classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# CLIP AI Endpoints

@APP.post("/api/clip/initialize")
async def initialize_clip():
    """Initialize CLIP model."""
    try:
        success = await clip_classifier.initialize()
        if success:
            log("[*] CLIP model initialized successfully")
            return {"ok": True, "message": "CLIP model loaded"}
        else:
            return {"ok": False, "error": "Failed to initialize CLIP model"}
    except Exception as e:
        log(f"[error] CLIP initialization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/clip/classify-image")
async def clip_classify_image(payload: dict):
    """Classify a single image using CLIP."""
    image_path = payload.get("image_path")
    text_prompts = payload.get("text_prompts")
    top_k = payload.get("top_k", 3)

    if not image_path:
        raise HTTPException(status_code=400, detail="image_path is required")

    try:
        result = await clip_classifier.classify_image(
            Path(image_path),
            text_prompts=text_prompts,
            top_k=top_k
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return {"ok": True, **result}
    except Exception as e:
        log(f"[error] CLIP classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/clip/search")
async def clip_search_images(payload: dict):
    """Search images using natural language query."""
    query = payload.get("query")
    folder_path = payload.get("folder_path")
    top_n = payload.get("top_n", 10)
    threshold = payload.get("threshold", 0.2)

    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    cfg = load_cfg()
    if not folder_path:
        folder_path = Path(cfg.out or str(Path.home() / "TelegramArchive"))
    else:
        folder_path = Path(folder_path)

    try:
        results = await clip_classifier.search_images(
            folder_path,
            query=query,
            top_n=top_n,
            threshold=threshold
        )

        log(f"[*] CLIP search completed: {len(results)} results for '{query}'")
        return {"ok": True, "results": results, "query": query, "count": len(results)}
    except Exception as e:
        log(f"[error] CLIP search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/clip/find-similar")
async def clip_find_similar(payload: dict):
    """Find similar images to a reference image."""
    reference_image = payload.get("reference_image")
    folder_path = payload.get("folder_path")
    top_n = payload.get("top_n", 5)
    threshold = payload.get("threshold", 0.85)

    if not reference_image:
        raise HTTPException(status_code=400, detail="reference_image is required")

    cfg = load_cfg()
    if not folder_path:
        folder_path = Path(cfg.out or str(Path.home() / "TelegramArchive"))
    else:
        folder_path = Path(folder_path)

    try:
        results = await clip_classifier.find_similar_images(
            Path(reference_image),
            folder_path,
            top_n=top_n,
            threshold=threshold
        )

        log(f"[*] Similar images found: {len(results)} matches")
        return {"ok": True, "results": results, "count": len(results)}
    except Exception as e:
        log(f"[error] Similarity search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Duplicate Detection Endpoints

@APP.post("/api/duplicates/scan")
async def scan_duplicates(payload: Optional[dict] = None):
    """Scan for duplicate images."""
    folder_path = payload.get("folder_path") if payload else None
    threshold = payload.get("threshold", 5) if payload else 5

    cfg = load_cfg()
    if not folder_path:
        folder_path = Path(cfg.out or str(Path.home() / "TelegramArchive"))
    else:
        folder_path = Path(folder_path)

    try:
        result = duplicate_detector.find_duplicates(folder_path, threshold=threshold)
        if "error" not in result:
            log(f"[*] Duplicate scan: {result.get('duplicate_groups', 0)} groups found, "
                f"{result.get('potential_savings_mb', 0)}MB potential savings")
        return {"ok": True, **result}
    except Exception as e:
        log(f"[error] Duplicate scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Webhook Management Endpoints

@APP.get("/api/webhooks")
def list_webhooks():
    """List all registered webhooks."""
    return {
        "ok": True,
        "webhooks": webhook_manager.webhooks,
        "supported_events": WEBHOOK_EVENTS
    }


@APP.post("/api/webhooks")
def create_webhook(payload: dict):
    """Create a new webhook subscription."""
    url = payload.get("url")
    events = payload.get("events", [])
    name = payload.get("name", "Unnamed Webhook")

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    if not events:
        raise HTTPException(status_code=400, detail="At least one event is required")

    # Validate events
    invalid_events = [e for e in events if e not in WEBHOOK_EVENTS]
    if invalid_events:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid events: {invalid_events}. Supported: {WEBHOOK_EVENTS}"
        )

    webhook = webhook_manager.add_webhook(url, events, name)
    log(f"[*] Created webhook: {name} for {len(events)} events")
    return {"ok": True, "webhook": webhook}


@APP.delete("/api/webhooks/{webhook_id}")
def delete_webhook(webhook_id: str):
    """Delete a webhook subscription."""
    if webhook_manager.remove_webhook(webhook_id):
        log(f"[*] Deleted webhook: {webhook_id}")
        return {"ok": True}
    else:
        raise HTTPException(status_code=404, detail="Webhook not found")


@APP.post("/api/webhooks/test")
async def test_webhook(payload: dict):
    """Test a webhook by sending a test event."""
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Create temporary webhook for testing
    test_webhook = {
        "id": "test",
        "name": "Test Webhook",
        "url": url,
        "events": ["test.event"],
        "enabled": True
    }

    test_data = {
        "timestamp": time.time(),
        "message": "This is a test webhook from Telegram Saver Bot"
    }

    try:
        await webhook_manager._send_webhook(test_webhook, "test.event", test_data)
        log(f"[*] Test webhook sent to: {url}")
        return {"ok": True, "message": "Test webhook sent successfully"}
    except Exception as e:
        log(f"[error] Test webhook failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Video Processing Endpoints

@APP.post("/api/video/thumbnail")
async def generate_video_thumbnail(payload: dict):
    """Generate thumbnail from video file."""
    video_path = payload.get("video_path")
    output_path = payload.get("output_path")

    if not video_path:
        raise HTTPException(status_code=400, detail="video_path is required")

    try:
        result = await video_processor.generate_thumbnail(
            Path(video_path),
            Path(output_path) if output_path else None
        )

        if result:
            log(f"[*] Thumbnail generated: {result}")
            return {"ok": True, "thumbnail_path": str(result)}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate thumbnail. OpenCV may not be installed.")
    except Exception as e:
        log(f"[error] Thumbnail generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/video/compress")
async def compress_video_file(payload: dict):
    """Compress video file using ffmpeg."""
    video_path = payload.get("video_path")
    output_path = payload.get("output_path")
    quality = payload.get("quality", 23)  # CRF value: 0-51 (lower = better)

    if not video_path:
        raise HTTPException(status_code=400, detail="video_path is required")

    try:
        result = await video_processor.compress_video(
            Path(video_path),
            Path(output_path) if output_path else None
        )

        if result:
            original_size = Path(video_path).stat().st_size
            compressed_size = result.stat().st_size
            savings_percent = ((original_size - compressed_size) / original_size) * 100

            log(f"[*] Video compressed: {result} ({savings_percent:.1f}% smaller)")
            return {
                "ok": True,
                "compressed_path": str(result),
                "original_size": original_size,
                "compressed_size": compressed_size,
                "savings_percent": round(savings_percent, 1)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to compress video. ffmpeg may not be installed.")
    except Exception as e:
        log(f"[error] Video compression failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/video/transcribe")
async def transcribe_video_audio(payload: dict):
    """Transcribe audio from video using Whisper AI."""
    video_path = payload.get("video_path")

    if not video_path:
        raise HTTPException(status_code=400, detail="video_path is required")

    try:
        result = await video_processor.transcribe_audio(Path(video_path))

        if result:
            log(f"[*] Video transcribed: {video_path}")
            return {"ok": True, "transcription": result}
        else:
            raise HTTPException(status_code=500, detail="Failed to transcribe video. Whisper AI may not be installed.")
    except Exception as e:
        log(f"[error] Video transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/video/status")
def get_video_processor_status():
    """Check video processor availability."""
    return {
        "ok": True,
        "available": video_processor.available,
        "features": {
            "thumbnails": video_processor.available,
            "compression": True,  # ffmpeg checked at runtime
            "transcription": True  # whisper checked at runtime
        }
    }


# IPFS/Blockchain Storage Endpoints

@APP.get("/api/ipfs/status")
def get_ipfs_status():
    """Check IPFS daemon connection status."""
    return {
        "ok": True,
        "available": ipfs_storage.available,
        "api_url": ipfs_storage.ipfs_api_url,
        "filecoin_enabled": ipfs_storage.enable_filecoin
    }


@APP.post("/api/ipfs/upload")
async def upload_to_ipfs(payload: dict):
    """Upload file to IPFS."""
    file_path = payload.get("file_path")

    if not file_path:
        raise HTTPException(status_code=400, detail="file_path is required")

    if not ipfs_storage.available:
        raise HTTPException(status_code=503, detail="IPFS daemon not available")

    try:
        result = await ipfs_storage.upload_file(Path(file_path))

        if result:
            log(f"[*] Uploaded to IPFS: {file_path} -> CID: {result['cid']}")
            return {"ok": True, **result}
        else:
            raise HTTPException(status_code=500, detail="Upload failed")
    except Exception as e:
        log(f"[error] IPFS upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ipfs/download")
async def download_from_ipfs(payload: dict):
    """Download file from IPFS using CID."""
    cid = payload.get("cid")
    output_path = payload.get("output_path")

    if not cid:
        raise HTTPException(status_code=400, detail="cid is required")

    if not ipfs_storage.available:
        raise HTTPException(status_code=503, detail="IPFS daemon not available")

    try:
        result_path = await ipfs_storage.download_file(
            cid,
            Path(output_path) if output_path else None
        )

        if result_path:
            log(f"[*] Downloaded from IPFS: {cid} -> {result_path}")
            return {"ok": True, "file_path": str(result_path)}
        else:
            raise HTTPException(status_code=500, detail="Download failed")
    except Exception as e:
        log(f"[error] IPFS download failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ipfs/pin")
async def pin_ipfs_file(payload: dict):
    """Pin file to IPFS (prevent garbage collection)."""
    cid = payload.get("cid")

    if not cid:
        raise HTTPException(status_code=400, detail="cid is required")

    try:
        success = await ipfs_storage.pin_file(cid)
        if success:
            log(f"[*] Pinned IPFS file: {cid}")
            return {"ok": True, "cid": cid}
        else:
            raise HTTPException(status_code=500, detail="Pin failed")
    except Exception as e:
        log(f"[error] IPFS pin failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ipfs/pins")
async def list_ipfs_pins():
    """List all pinned CIDs."""
    try:
        pins = await ipfs_storage.list_pins()
        log(f"[*] Listed {len(pins)} IPFS pins")
        return {"ok": True, "pins": pins, "count": len(pins)}
    except Exception as e:
        log(f"[error] Failed to list IPFS pins: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ipfs/upload-folder")
async def upload_folder_to_ipfs(payload: dict):
    """Upload entire folder to IPFS."""
    folder_path = payload.get("folder_path")

    if not folder_path:
        raise HTTPException(status_code=400, detail="folder_path is required")

    if not ipfs_storage.available:
        raise HTTPException(status_code=503, detail="IPFS daemon not available")

    try:
        result = await ipfs_storage.upload_folder(Path(folder_path))

        if result:
            log(f"[*] Uploaded folder to IPFS: {folder_path} -> CID: {result['root_cid']}")
            return {"ok": True, **result}
        else:
            raise HTTPException(status_code=500, detail="Folder upload failed")
    except Exception as e:
        log(f"[error] IPFS folder upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ipfs/gateway-url/{cid}")
def get_ipfs_gateway_url(cid: str, gateway: str = "ipfs.io"):
    """Get public gateway URL for a CID."""
    url = ipfs_storage.get_ipfs_url(cid, gateway)
    return {"ok": True, "cid": cid, "gateway_url": url}


# Plugin System Endpoints

@APP.get("/api/plugins")
def list_all_plugins():
    """List all loaded plugins."""
    plugins = plugin_manager.list_plugins()
    return {
        "ok": True,
        "plugins": plugins,
        "count": len(plugins)
    }


@APP.get("/api/plugins/discover")
def discover_available_plugins():
    """Discover available plugins in the plugins directory."""
    discovered = plugin_manager.discover_plugins()
    return {
        "ok": True,
        "available_plugins": discovered,
        "count": len(discovered)
    }


@APP.post("/api/plugins/load")
def load_plugin_endpoint(payload: dict):
    """Load a plugin by module name."""
    module_name = payload.get("module_name")

    if not module_name:
        raise HTTPException(status_code=400, detail="module_name is required")

    try:
        success = plugin_manager.load_plugin(module_name)
        if success:
            log(f"[*] Loaded plugin: {module_name}")
            return {"ok": True, "message": f"Plugin {module_name} loaded successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to load plugin")
    except Exception as e:
        log(f"[error] Failed to load plugin {module_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/unload")
def unload_plugin_endpoint(payload: dict):
    """Unload a plugin by name."""
    plugin_name = payload.get("plugin_name")

    if not plugin_name:
        raise HTTPException(status_code=400, detail="plugin_name is required")

    try:
        success = plugin_manager.unload_plugin(plugin_name)
        if success:
            log(f"[*] Unloaded plugin: {plugin_name}")
            return {"ok": True, "message": f"Plugin {plugin_name} unloaded successfully"}
        else:
            raise HTTPException(status_code=404, detail="Plugin not found")
    except Exception as e:
        log(f"[error] Failed to unload plugin {plugin_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/enable/{plugin_name}")
def enable_plugin_endpoint(plugin_name: str):
    """Enable a plugin."""
    success = plugin_manager.enable_plugin(plugin_name)
    if success:
        log(f"[*] Enabled plugin: {plugin_name}")
        return {"ok": True, "message": f"Plugin {plugin_name} enabled"}
    else:
        raise HTTPException(status_code=404, detail="Plugin not found")


@APP.post("/api/plugins/disable/{plugin_name}")
def disable_plugin_endpoint(plugin_name: str):
    """Disable a plugin."""
    success = plugin_manager.disable_plugin(plugin_name)
    if success:
        log(f"[*] Disabled plugin: {plugin_name}")
        return {"ok": True, "message": f"Plugin {plugin_name} disabled"}
    else:
        raise HTTPException(status_code=404, detail="Plugin not found")


@APP.get("/api/plugins/{plugin_name}")
def get_plugin_info(plugin_name: str):
    """Get detailed information about a plugin."""
    plugin = plugin_manager.get_plugin(plugin_name)
    if plugin:
        return {"ok": True, "plugin": plugin.get_info()}
    else:
        raise HTTPException(status_code=404, detail="Plugin not found")


# i18n (Internationalization) Endpoints

@APP.get("/api/i18n/languages")
def get_supported_languages():
    """Get list of supported languages."""
    languages = i18n_manager.get_supported_languages()
    return {
        "ok": True,
        "languages": languages,
        "default": i18n_manager.default_language
    }


@APP.get("/api/i18n/translations/{lang_code}")
def get_translations(lang_code: str):
    """Get all translations for a specific language."""
    translations = i18n_manager.get_all_translations(lang_code)
    if translations:
        return {
            "ok": True,
            "lang_code": lang_code,
            "translations": translations
        }
    else:
        raise HTTPException(status_code=404, detail="Language not found")


@APP.get("/api/i18n/translate")
def translate(lang: str, key: str):
    """
    Get a specific translation.

    Query params:
    - lang: Language code (en, tr, es, etc.)
    - key: Translation key in dot notation (e.g., "common.start")
    """
    translation = i18n_manager.get_translation(lang, key)
    return {
        "ok": True,
        "lang": lang,
        "key": key,
        "translation": translation
    }


@APP.post("/api/i18n/add-translation")
def add_translation(payload: dict):
    """
    Add or update a translation.

    Body:
    {
        "lang_code": "en",
        "key": "custom.message",
        "value": "Hello World"
    }
    """
    lang_code = payload.get("lang_code")
    key = payload.get("key")
    value = payload.get("value")

    if not all([lang_code, key, value]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    success = i18n_manager.add_translation(lang_code, key, value)
    if success:
        return {"ok": True, "message": "Translation added successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to add translation")


# RBAC (Role-Based Access Control) & Multi-Tenant Endpoints

@APP.get("/api/rbac/organizations")
def list_organizations():
    """List all organizations."""
    orgs = rbac_manager.list_organizations()
    return {
        "ok": True,
        "organizations": [org.to_dict() for org in orgs],
        "count": len(orgs)
    }


@APP.post("/api/rbac/organizations")
def create_organization(payload: dict):
    """
    Create new organization.

    Body:
    {
        "name": "Acme Corp",
        "plan": "pro"  # free, pro, enterprise
    }
    """
    name = payload.get("name")
    plan = payload.get("plan", "free")

    if not name:
        raise HTTPException(status_code=400, detail="Organization name required")

    org = rbac_manager.create_organization(name, plan)
    return {"ok": True, "organization": org.to_dict()}


@APP.get("/api/rbac/organizations/{org_id}")
def get_organization(org_id: str):
    """Get organization details."""
    org = rbac_manager.get_organization(org_id)
    if org:
        # Get org users
        users = rbac_manager.list_users(org_id)
        org_dict = org.to_dict()
        org_dict["users"] = [u.to_dict() for u in users]
        org_dict["user_count"] = len(users)
        return {"ok": True, "organization": org_dict}
    else:
        raise HTTPException(status_code=404, detail="Organization not found")


@APP.delete("/api/rbac/organizations/{org_id}")
def delete_organization(org_id: str):
    """Delete organization and all its users."""
    success = rbac_manager.delete_organization(org_id)
    if success:
        return {"ok": True, "message": "Organization deleted"}
    else:
        raise HTTPException(status_code=404, detail="Organization not found")


@APP.get("/api/rbac/users")
def list_users(org_id: Optional[str] = None):
    """List users, optionally filtered by organization."""
    users = rbac_manager.list_users(org_id)
    return {
        "ok": True,
        "users": [user.to_dict() for user in users],
        "count": len(users)
    }


@APP.post("/api/rbac/users")
def create_user(payload: dict):
    """
    Create new user.

    Body:
    {
        "username": "john_doe",
        "email": "john@example.com",
        "organization_id": "org_xxx",
        "role_ids": ["admin", "manager"]
    }
    """
    username = payload.get("username")
    email = payload.get("email")
    organization_id = payload.get("organization_id")
    role_ids = payload.get("role_ids", [])

    if not all([username, email, organization_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    user = rbac_manager.create_user(username, email, organization_id, role_ids)
    if user:
        return {"ok": True, "user": user.to_dict()}
    else:
        raise HTTPException(status_code=400, detail="Failed to create user")


@APP.get("/api/rbac/users/{user_id}")
def get_user(user_id: str):
    """Get user details."""
    user = rbac_manager.get_user(user_id)
    if user:
        user_dict = user.to_dict()
        # Add role details
        roles = [rbac_manager.get_role(rid).to_dict() for rid in user.roles if rbac_manager.get_role(rid)]
        user_dict["role_details"] = roles
        return {"ok": True, "user": user_dict}
    else:
        raise HTTPException(status_code=404, detail="User not found")


@APP.delete("/api/rbac/users/{user_id}")
def delete_user(user_id: str):
    """Delete user."""
    success = rbac_manager.delete_user(user_id)
    if success:
        return {"ok": True, "message": "User deleted"}
    else:
        raise HTTPException(status_code=404, detail="User not found")


@APP.post("/api/rbac/users/{user_id}/roles")
def assign_role_to_user(user_id: str, payload: dict):
    """
    Assign role to user.

    Body:
    {
        "role_id": "admin"
    }
    """
    role_id = payload.get("role_id")
    if not role_id:
        raise HTTPException(status_code=400, detail="role_id required")

    user = rbac_manager.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = rbac_manager.get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    user.add_role(role_id)
    rbac_manager._save_data()

    return {"ok": True, "message": f"Role {role_id} assigned to user"}


@APP.delete("/api/rbac/users/{user_id}/roles/{role_id}")
def remove_role_from_user(user_id: str, role_id: str):
    """Remove role from user."""
    user = rbac_manager.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.remove_role(role_id)
    rbac_manager._save_data()

    return {"ok": True, "message": f"Role {role_id} removed from user"}


@APP.get("/api/rbac/roles")
def list_roles():
    """List all roles."""
    roles = rbac_manager.list_roles()
    return {
        "ok": True,
        "roles": [role.to_dict() for role in roles],
        "count": len(roles)
    }


@APP.post("/api/rbac/roles")
def create_role(payload: dict):
    """
    Create custom role.

    Body:
    {
        "name": "Content Manager",
        "description": "Can manage media and downloads",
        "permissions": ["media.view", "media.upload", "download.start"]
    }
    """
    name = payload.get("name")
    description = payload.get("description", "")
    permission_strings = payload.get("permissions", [])

    if not name:
        raise HTTPException(status_code=400, detail="Role name required")

    # Convert permission strings to Permission enums
    try:
        permissions = [Permission(p) for p in permission_strings]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid permission: {e}")

    role = rbac_manager.create_role(name, description, permissions)
    return {"ok": True, "role": role.to_dict()}


@APP.get("/api/rbac/roles/{role_id}")
def get_role(role_id: str):
    """Get role details."""
    role = rbac_manager.get_role(role_id)
    if role:
        return {"ok": True, "role": role.to_dict()}
    else:
        raise HTTPException(status_code=404, detail="Role not found")


@APP.delete("/api/rbac/roles/{role_id}")
def delete_role(role_id: str):
    """Delete custom role (cannot delete system roles)."""
    success = rbac_manager.delete_role(role_id)
    if success:
        return {"ok": True, "message": "Role deleted"}
    else:
        raise HTTPException(status_code=400, detail="Cannot delete system role or role not found")


@APP.get("/api/rbac/permissions")
def list_permissions():
    """List all available permissions."""
    permissions = [
        {"name": p.value, "category": p.value.split(".")[0]}
        for p in Permission
    ]

    # Group by category
    categories = {}
    for perm in permissions:
        cat = perm["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(perm["name"])

    return {
        "ok": True,
        "permissions": permissions,
        "categories": categories
    }


@APP.post("/api/rbac/check-permission")
def check_permission(payload: dict):
    """
    Check if user has a specific permission.

    Body:
    {
        "user_id": "user_xxx",
        "permission": "media.delete"
    }
    """
    user_id = payload.get("user_id")
    permission_str = payload.get("permission")

    if not all([user_id, permission_str]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        permission = Permission(permission_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid permission")

    has_perm = rbac_manager.user_has_permission(user_id, permission)

    return {
        "ok": True,
        "user_id": user_id,
        "permission": permission_str,
        "has_permission": has_perm
    }


@APP.post("/api/rbac/authenticate")
def authenticate_api_key(payload: dict):
    """
    Authenticate using API key.

    Body:
    {
        "api_key": "tk_xxx"
    }
    """
    api_key = payload.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key required")

    user = rbac_manager.check_api_key(api_key)
    if user:
        return {
            "ok": True,
            "authenticated": True,
            "user": user.to_dict()
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid API key")


# Content Moderation Endpoints

@APP.post("/api/moderation/moderate")
async def moderate_file(payload: dict):
    """
    Moderate a file for inappropriate content.

    Body:
    {
        "file_path": "/path/to/file.jpg",
        "metadata": {"caption": "Optional text"}
    }
    """
    file_path_str = payload.get("file_path")
    metadata = payload.get("metadata", {})

    if not file_path_str:
        raise HTTPException(status_code=400, detail="file_path required")

    file_path = Path(file_path_str)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    result = await content_moderator.moderate_content(file_path, metadata)

    return {
        "ok": True,
        "result": result.to_dict()
    }


@APP.get("/api/moderation/rules")
def list_moderation_rules():
    """List all moderation rules."""
    rules = content_moderator.list_rules()
    return {
        "ok": True,
        "rules": [rule.to_dict() for rule in rules],
        "count": len(rules)
    }


@APP.post("/api/moderation/rules")
def create_moderation_rule(payload: dict):
    """
    Create custom moderation rule.

    Body:
    {
        "name": "Strict Violence Filter",
        "category": "violence",
        "action": "block",
        "threshold": 0.5
    }
    """
    name = payload.get("name")
    category_str = payload.get("category")
    action_str = payload.get("action")
    threshold = payload.get("threshold", 0.5)

    if not all([name, category_str, action_str]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        category = ContentCategory(category_str)
        action = ModerationAction(action_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid category or action: {e}")

    rule = content_moderator.create_rule(name, category, action, threshold)

    return {"ok": True, "rule": rule.to_dict()}


@APP.get("/api/moderation/rules/{rule_id}")
def get_moderation_rule(rule_id: str):
    """Get moderation rule details."""
    rule = content_moderator.get_rule(rule_id)
    if rule:
        return {"ok": True, "rule": rule.to_dict()}
    else:
        raise HTTPException(status_code=404, detail="Rule not found")


@APP.put("/api/moderation/rules/{rule_id}")
def update_moderation_rule(rule_id: str, payload: dict):
    """
    Update moderation rule.

    Body:
    {
        "name": "Updated name",
        "threshold": 0.7,
        "action": "warn",
        "enabled": true
    }
    """
    success = content_moderator.update_rule(rule_id, **payload)
    if success:
        return {"ok": True, "message": "Rule updated"}
    else:
        raise HTTPException(status_code=404, detail="Rule not found")


@APP.delete("/api/moderation/rules/{rule_id}")
def delete_moderation_rule(rule_id: str):
    """Delete moderation rule."""
    success = content_moderator.delete_rule(rule_id)
    if success:
        return {"ok": True, "message": "Rule deleted"}
    else:
        raise HTTPException(status_code=404, detail="Rule not found")


@APP.get("/api/moderation/history")
def get_moderation_history(limit: int = 100):
    """Get recent moderation history."""
    history = content_moderator.get_moderation_history(limit)
    return {
        "ok": True,
        "history": [result.to_dict() for result in history],
        "count": len(history)
    }


@APP.get("/api/moderation/statistics")
def get_moderation_statistics():
    """Get moderation statistics."""
    stats = content_moderator.get_statistics()
    return {
        "ok": True,
        "statistics": stats
    }


@APP.post("/api/moderation/block-hash")
def block_file_hash(payload: dict):
    """
    Block a file hash.

    Body:
    {
        "file_hash": "abc123..."
    }
    """
    file_hash = payload.get("file_hash")
    if not file_hash:
        raise HTTPException(status_code=400, detail="file_hash required")

    content_moderator.block_hash(file_hash)
    return {"ok": True, "message": "Hash blocked"}


@APP.post("/api/moderation/unblock-hash")
def unblock_file_hash(payload: dict):
    """
    Unblock a file hash.

    Body:
    {
        "file_hash": "abc123..."
    }
    """
    file_hash = payload.get("file_hash")
    if not file_hash:
        raise HTTPException(status_code=400, detail="file_hash required")

    content_moderator.unblock_hash(file_hash)
    return {"ok": True, "message": "Hash unblocked"}


@APP.get("/api/moderation/categories")
def list_content_categories():
    """List all content categories."""
    categories = [
        {"value": cat.value, "name": cat.value.replace("_", " ").title()}
        for cat in ContentCategory
    ]
    return {
        "ok": True,
        "categories": categories
    }


@APP.get("/api/moderation/actions")
def list_moderation_actions():
    """List all possible moderation actions."""
    actions = [
        {"value": action.value, "name": action.value.title()}
        for action in ModerationAction
    ]
    return {
        "ok": True,
        "actions": actions
    }


# Scheduled Tasks Endpoints

@APP.get("/api/scheduled-tasks")
def list_scheduled_tasks():
    """List all scheduled tasks."""
    tasks = task_scheduler.list_tasks()
    return {
        "ok": True,
        "tasks": [task.to_dict() for task in tasks]
    }


@APP.post("/api/scheduled-tasks")
def create_scheduled_task(payload: dict):
    """Create a new scheduled task."""
    import uuid
    try:
        task_id = payload.get("task_id") or str(uuid.uuid4())
        name = payload.get("name")
        schedule_type = payload.get("schedule_type")

        if not all([name, schedule_type]):
            raise HTTPException(status_code=400, detail="Name and schedule_type are required")

        task = ScheduledTask(
            task_id=task_id,
            name=name,
            schedule_type=ScheduleType(schedule_type),
            chats=payload.get("chats"),
            media_types=payload.get("media_types"),
            enabled=payload.get("enabled", True),
            hour=payload.get("hour", 0),
            minute=payload.get("minute", 0),
            day_of_week=payload.get("day_of_week", 0),
            interval_hours=payload.get("interval_hours", 24),
            run_date=payload.get("run_date")
        )

        if task_scheduler.add_task(task):
            log(f"[*] Created scheduled task: {name}")
            return {"ok": True, "task": task.to_dict()}
        else:
            raise HTTPException(status_code=500, detail="Failed to create task")

    except Exception as e:
        log(f"[error] Failed to create scheduled task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/scheduled-tasks/{task_id}")
def delete_scheduled_task(task_id: str):
    """Delete a scheduled task."""
    if task_scheduler.remove_task(task_id):
        log(f"[*] Deleted scheduled task: {task_id}")
        return {"ok": True}
    else:
        raise HTTPException(status_code=404, detail="Task not found")


@APP.post("/api/scheduled-tasks/{task_id}/enable")
def enable_scheduled_task(task_id: str):
    """Enable a scheduled task."""
    if task_scheduler.enable_task(task_id):
        log(f"[*] Enabled scheduled task: {task_id}")
        return {"ok": True}
    else:
        raise HTTPException(status_code=404, detail="Task not found")


@APP.post("/api/scheduled-tasks/{task_id}/disable")
def disable_scheduled_task(task_id: str):
    """Disable a scheduled task."""
    if task_scheduler.disable_task(task_id):
        log(f"[*] Disabled scheduled task: {task_id}")
        return {"ok": True}
    else:
        raise HTTPException(status_code=404, detail="Task not found")


@APP.get("/api/scheduled-tasks/{task_id}")
def get_scheduled_task(task_id: str):
    """Get details of a specific scheduled task."""
    task = task_scheduler.get_task(task_id)
    if task:
        return {"ok": True, "task": task.to_dict()}
    else:
        raise HTTPException(status_code=404, detail="Task not found")


async def broadcast_progress():
    """Broadcast progress updates to all connected WebSocket clients."""
    if not STATE["websocket_clients"]:
        return

    message = json.dumps({
        "type": "progress",
        "data": {
            "running": STATE["running"],
            "progress": STATE["progress"],
            "timestamp": time.time()
        }
    })

    # Remove disconnected clients
    disconnected = set()
    for client in STATE["websocket_clients"]:
        try:
            await client.send_text(message)
        except Exception:
            disconnected.add(client)

    STATE["websocket_clients"] -= disconnected


@APP.websocket("/ws/progress")
async def websocket_progress(websocket: WebSocket):
    """WebSocket endpoint for real-time progress updates."""
    await websocket.accept()
    STATE["websocket_clients"].add(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(STATE['websocket_clients'])}")

    try:
        # Send initial state
        await websocket.send_json({
            "type": "initial",
            "data": {
                "running": STATE["running"],
                "progress": STATE["progress"]
            }
        })

        # Keep connection alive and handle ping/pong
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Echo back ping messages
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_text("ping")
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        STATE["websocket_clients"].discard(websocket)

# ============= AI Assistant API =============

# AI Assistant configuration
AI_ASSISTANT_CONFIG_FILE = ROOT / "ai_assistant_config.json"

def load_ai_config():
    """Load AI assistant configuration"""
    if AI_ASSISTANT_CONFIG_FILE.exists():
        with open(AI_ASSISTANT_CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {'api_key': '', 'enabled': False}

def save_ai_config(config: dict):
    """Save AI assistant configuration"""
    with open(AI_ASSISTANT_CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

class AIChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

class AIConfigRequest(BaseModel):
    api_key: str
    enabled: bool

@APP.get("/api/ai/config")
async def get_ai_config():
    """Get AI assistant configuration (without exposing API key)"""
    config = load_ai_config()
    return {
        'enabled': config.get('enabled', False),
        'has_api_key': bool(config.get('api_key', ''))
    }

@APP.post("/api/ai/config")
async def update_ai_config(request: AIConfigRequest):
    """Update AI assistant configuration"""
    try:
        config = {
            'api_key': request.api_key,
            'enabled': request.enabled
        }
        save_ai_config(config)

        # Reinitialize assistant with new config
        from api.ai.assistant import get_assistant
        get_assistant(api_key=request.api_key if request.enabled else None)

        return {'success': True, 'message': 'AI configuration updated'}
    except Exception as e:
        logger.error(f"Failed to update AI config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest):
    """Chat with AI assistant"""
    try:
        from api.ai.assistant import get_assistant

        # Load config
        config = load_ai_config()
        if not config.get('enabled'):
            return {
                'success': False,
                'error': 'AI assistant is not enabled'
            }

        # Get assistant instance
        assistant = get_assistant(api_key=config.get('api_key'))

        if not assistant.is_enabled():
            return {
                'success': False,
                'error': 'AI assistant is not properly configured'
            }

        # Process chat
        response = await assistant.chat(request.message, request.context)

        return response

    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return {
            'success': False,
            'error': str(e),
            'response': f'Sorry, I encountered an error: {str(e)}'
        }

@APP.post("/api/ai/parse-command")
async def parse_command(request: AIChatRequest):
    """Parse natural language command"""
    try:
        from api.ai.assistant import get_assistant

        config = load_ai_config()
        assistant = get_assistant(api_key=config.get('api_key'))

        # Use rule-based parser (doesn't require API key)
        result = assistant.parse_natural_language_command(request.message)

        if result:
            return {'success': True, 'result': result}
        else:
            return {'success': False, 'error': 'Could not parse command'}

    except Exception as e:
        logger.error(f"Command parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/ai/suggestions")
async def get_suggestions(context: Optional[str] = None):
    """Get AI-powered suggestions"""
    try:
        from api.ai.assistant import get_assistant

        config = load_ai_config()
        assistant = get_assistant(api_key=config.get('api_key'))

        context_dict = json.loads(context) if context else None
        suggestions = assistant.get_suggestions(context_dict)

        return {'success': True, 'suggestions': suggestions}

    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/ai/clear-history")
async def clear_history():
    """Clear conversation history"""
    try:
        from api.ai.assistant import get_assistant

        config = load_ai_config()
        assistant = get_assistant(api_key=config.get('api_key'))
        assistant.clear_history()

        return {'success': True, 'message': 'History cleared'}

    except Exception as e:
        logger.error(f"Clear history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/ping")
async def ping():
    """Simple ping endpoint for connection checking"""
    return {'status': 'ok', 'timestamp': time.time()}

# ============= Content Summarization API =============

class SummarizeTextRequest(BaseModel):
    text: str
    style: Optional[str] = 'concise'
    max_length: Optional[int] = 500
    extract_keywords: Optional[bool] = True

class SummarizeMessagesRequest(BaseModel):
    messages: List[dict]
    style: Optional[str] = 'concise'

class TranscribeAudioRequest(BaseModel):
    file_path: str
    language: Optional[str] = None
    translate: Optional[bool] = False

class SummarizeVideoRequest(BaseModel):
    file_path: str
    style: Optional[str] = 'concise'

@APP.post("/api/summarize/text")
async def summarize_text(request: SummarizeTextRequest):
    """Summarize text content"""
    try:
        from api.ai.summarization import get_engine
        from api.ai.assistant import get_assistant

        # Get AI config
        config = load_ai_config()
        if not config.get('enabled'):
            raise HTTPException(status_code=400, detail="AI features are not enabled")

        # Get engine
        engine = get_engine(api_key=config.get('api_key'))

        if not engine.is_enabled():
            raise HTTPException(status_code=400, detail="Summarization engine is not configured")

        # Summarize
        options = {
            'style': request.style,
            'max_length': request.max_length,
            'extract_keywords': request.extract_keywords
        }

        result = await engine.summarize_text(request.text, options)

        return result

    except Exception as e:
        logger.error(f"Text summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/summarize/messages")
async def summarize_messages(request: SummarizeMessagesRequest):
    """Summarize chat messages"""
    try:
        from api.ai.summarization import get_engine

        config = load_ai_config()
        if not config.get('enabled'):
            raise HTTPException(status_code=400, detail="AI features are not enabled")

        engine = get_engine(api_key=config.get('api_key'))

        if not engine.is_enabled():
            raise HTTPException(status_code=400, detail="Summarization engine is not configured")

        options = {'style': request.style}
        result = await engine.summarize_messages(request.messages, options)

        return result

    except Exception as e:
        logger.error(f"Message summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/summarize/audio")
async def transcribe_audio(request: TranscribeAudioRequest):
    """Transcribe audio file to text"""
    try:
        from api.ai.summarization import get_engine

        config = load_ai_config()
        if not config.get('enabled'):
            raise HTTPException(status_code=400, detail="AI features are not enabled")

        engine = get_engine(api_key=config.get('api_key'))

        if not engine.is_enabled():
            raise HTTPException(status_code=400, detail="Transcription is not configured")

        # Check if file exists
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="Audio file not found")

        options = {
            'language': request.language,
            'translate': request.translate
        }

        result = await engine.transcribe_audio(request.file_path, options)

        return result

    except Exception as e:
        logger.error(f"Audio transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/summarize/video")
async def summarize_video(request: SummarizeVideoRequest):
    """Summarize video (transcript + summary)"""
    try:
        from api.ai.summarization import get_engine

        config = load_ai_config()
        if not config.get('enabled'):
            raise HTTPException(status_code=400, detail="AI features are not enabled")

        engine = get_engine(api_key=config.get('api_key'))

        if not engine.is_enabled():
            raise HTTPException(status_code=400, detail="Video summarization is not configured")

        # Check if file exists
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="Video file not found")

        options = {'style': request.style}
        result = await engine.summarize_video(request.file_path, options)

        return result

    except Exception as e:
        logger.error(f"Video summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Auto-Tagging API =============

class TagImageRequest(BaseModel):
    image_path: str
    use_clip: Optional[bool] = True
    use_vit: Optional[bool] = True
    custom_labels: Optional[List[str]] = None
    confidence_threshold: Optional[float] = 0.3

class BatchTagRequest(BaseModel):
    image_paths: List[str]
    use_clip: Optional[bool] = True
    use_vit: Optional[bool] = True
    confidence_threshold: Optional[float] = 0.3

class SuggestTagsRequest(BaseModel):
    existing_tags: List[str]
    context: Optional[dict] = None

@APP.post("/api/tagging/initialize")
async def initialize_tagging():
    """Initialize auto-tagging models"""
    try:
        from api.ai.tagging import get_tagging_engine

        engine = get_tagging_engine()

        if not engine.is_available():
            raise HTTPException(
                status_code=400,
                detail="Auto-tagging is not available. Required libraries not installed."
            )

        result = await engine.initialize_models()

        return result

    except Exception as e:
        logger.error(f"Tagging initialization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/tagging/tag-image")
async def tag_image(request: TagImageRequest):
    """Auto-tag a single image"""
    try:
        from api.ai.tagging import get_tagging_engine

        engine = get_tagging_engine()

        if not engine.is_available():
            raise HTTPException(
                status_code=400,
                detail="Auto-tagging is not available"
            )

        # Check if image exists
        if not Path(request.image_path).exists():
            raise HTTPException(status_code=404, detail="Image not found")

        options = {
            'use_clip': request.use_clip,
            'use_vit': request.use_vit,
            'custom_labels': request.custom_labels or [],
            'confidence_threshold': request.confidence_threshold
        }

        result = await engine.tag_image(request.image_path, options)

        return result

    except Exception as e:
        logger.error(f"Image tagging error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/tagging/batch-tag")
async def batch_tag_images(request: BatchTagRequest):
    """Auto-tag multiple images"""
    try:
        from api.ai.tagging import get_tagging_engine

        engine = get_tagging_engine()

        if not engine.is_available():
            raise HTTPException(
                status_code=400,
                detail="Auto-tagging is not available"
            )

        options = {
            'use_clip': request.use_clip,
            'use_vit': request.use_vit,
            'confidence_threshold': request.confidence_threshold
        }

        result = await engine.batch_tag_images(request.image_paths, options)

        return result

    except Exception as e:
        logger.error(f"Batch tagging error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/tagging/suggest")
async def suggest_tags(request: SuggestTagsRequest):
    """Get tag suggestions based on existing tags"""
    try:
        from api.ai.tagging import get_tagging_engine

        engine = get_tagging_engine()
        suggestions = await engine.suggest_tags(request.existing_tags, request.context)

        return {
            'success': True,
            'suggestions': suggestions
        }

    except Exception as e:
        logger.error(f"Tag suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/tagging/categories")
async def get_categories():
    """Get available tagging categories"""
    try:
        from api.ai.tagging import get_tagging_engine

        engine = get_tagging_engine()
        categories = engine.get_available_categories()

        return {
            'success': True,
            'categories': categories
        }

    except Exception as e:
        logger.error(f"Get categories error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Advanced Search API =============

class AdvancedSearchRequest(BaseModel):
    query: str
    mode: Optional[str] = 'fuzzy'  # fuzzy, exact, regex, fulltext
    filters: Optional[dict] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0
    sort_by: Optional[str] = 'relevance'
    sort_order: Optional[str] = 'desc'

class SaveSearchRequest(BaseModel):
    name: str
    query: str
    mode: str
    filters: Optional[dict] = None

class ImageSimilarityRequest(BaseModel):
    reference_image_path: str
    threshold: Optional[float] = 0.8
    limit: Optional[int] = 50

@APP.post("/api/search/advanced")
async def advanced_search(request: AdvancedSearchRequest):
    """Perform advanced search"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine(database=db)

        options = {
            'mode': request.mode,
            'filters': request.filters or {},
            'limit': request.limit,
            'offset': request.offset,
            'sort_by': request.sort_by,
            'sort_order': request.sort_order
        }

        result = engine.search(request.query, options)

        return result

    except Exception as e:
        logger.error(f"Advanced search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/search/history")
async def get_search_history(limit: int = 20):
    """Get search history"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine()
        history = engine.get_history(limit)

        return {
            'success': True,
            'history': history
        }

    except Exception as e:
        logger.error(f"Get history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/search/history/clear")
async def clear_search_history():
    """Clear search history"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine()
        engine.clear_history()

        return {
            'success': True,
            'message': 'Search history cleared'
        }

    except Exception as e:
        logger.error(f"Clear history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/search/save")
async def save_search(request: SaveSearchRequest):
    """Save search for later use"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine()
        engine.save_search(request.name, request.query, request.mode, request.filters or {})

        return {
            'success': True,
            'message': f'Search saved as "{request.name}"'
        }

    except Exception as e:
        logger.error(f"Save search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/search/saved")
async def get_saved_searches():
    """Get all saved searches"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine()
        saved = engine.get_saved_searches()

        return {
            'success': True,
            'saved_searches': saved
        }

    except Exception as e:
        logger.error(f"Get saved searches error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.delete("/api/search/saved/{name}")
async def delete_saved_search(name: str):
    """Delete saved search"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine()
        engine.delete_saved_search(name)

        return {
            'success': True,
            'message': f'Search "{name}" deleted'
        }

    except Exception as e:
        logger.error(f"Delete saved search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/search/image-similarity")
async def image_similarity_search(request: ImageSimilarityRequest):
    """Search for similar images"""
    try:
        from api.search.advanced import get_search_engine

        engine = get_search_engine()
        result = engine.image_similarity_search(
            request.reference_image_path,
            request.threshold,
            request.limit
        )

        return result

    except Exception as e:
        logger.error(f"Image similarity search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Cloud Sync API =============

class RegisterDeviceRequest(BaseModel):
    device_name: str
    device_type: str  # desktop, mobile, web
    user_id: Optional[str] = 'default'

class SyncSettingsRequest(BaseModel):
    device_id: str
    settings: dict
    encrypt: Optional[bool] = True

class SyncQueueRequest(BaseModel):
    device_id: str
    queue_items: List[dict]
    encrypt: Optional[bool] = True

class MergeQueueRequest(BaseModel):
    local_queue: List[dict]
    synced_queue: List[dict]

# Browser Extension API Models
class ExtensionSendLinkRequest(BaseModel):
    url: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    is_telegram_link: Optional[bool] = False
    timestamp: Optional[str] = None

class ExtensionSendMediaRequest(BaseModel):
    media_url: str
    media_type: str  # 'image' or 'video'
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    timestamp: Optional[str] = None

class ExtensionSendTextRequest(BaseModel):
    text: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    telegram_links: Optional[List[str]] = []
    timestamp: Optional[str] = None

@APP.post("/api/sync/register-device")
async def register_device(request: RegisterDeviceRequest):
    """Register a new device for sync"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.register_device(
            request.device_name,
            request.device_type,
            request.user_id
        )

        return result

    except Exception as e:
        logger.error(f"Register device error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/sync/devices")
async def get_devices(user_id: str = 'default'):
    """Get all registered devices"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        devices = sync_service.get_devices(user_id)

        return {
            'success': True,
            'devices': devices
        }

    except Exception as e:
        logger.error(f"Get devices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.delete("/api/sync/devices/{device_id}")
async def remove_device(device_id: str):
    """Remove a device"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.remove_device(device_id)

        return result

    except Exception as e:
        logger.error(f"Remove device error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/sync/settings")
async def sync_settings(request: SyncSettingsRequest):
    """Sync settings from device"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.sync_settings(
            request.device_id,
            request.settings,
            request.encrypt
        )

        return result

    except Exception as e:
        logger.error(f"Sync settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/sync/settings/{device_id}")
async def get_synced_settings(device_id: str, decrypt: bool = True):
    """Get synced settings for device"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.get_synced_settings(device_id, decrypt)

        return result

    except Exception as e:
        logger.error(f"Get synced settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/sync/queue")
async def sync_queue(request: SyncQueueRequest):
    """Sync download queue from device"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.sync_queue(
            request.device_id,
            request.queue_items,
            request.encrypt
        )

        return result

    except Exception as e:
        logger.error(f"Sync queue error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/sync/queue/{device_id}")
async def get_synced_queue(device_id: str, decrypt: bool = True):
    """Get synced queue for device"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.get_synced_queue(device_id, decrypt)

        return result

    except Exception as e:
        logger.error(f"Get synced queue error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/sync/merge-queue")
async def merge_queues(request: MergeQueueRequest):
    """Merge local and synced queues"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        merged_queue = sync_service.merge_queues(
            request.local_queue,
            request.synced_queue
        )

        return {
            'success': True,
            'merged_queue': merged_queue,
            'item_count': len(merged_queue)
        }

    except Exception as e:
        logger.error(f"Merge queues error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/sync/status/{device_id}")
async def get_sync_status(device_id: str):
    """Get sync status for device"""
    try:
        from api.sync.cloud_sync_service import get_sync_service

        sync_service = get_sync_service()
        result = sync_service.get_sync_status(device_id)

        return result

    except Exception as e:
        logger.error(f"Get sync status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Browser Extension API
# =============================================================================

@APP.get("/api/ping")
async def ping():
    """Health check endpoint for browser extension"""
    return {
        'success': True,
        'status': 'ok',
        'timestamp': time.time()
    }

@APP.post("/api/extension/send-link")
async def extension_send_link(request: ExtensionSendLinkRequest):
    """Receive link from browser extension"""
    try:
        logger.info(f"Extension sent link: {request.url}")
        
        # Store link in extension_links file
        extension_data_dir = Path('extension_data')
        extension_data_dir.mkdir(exist_ok=True)
        
        links_file = extension_data_dir / 'received_links.jsonl'
        
        link_data = {
            'url': request.url,
            'source_url': request.source_url,
            'source_title': request.source_title,
            'is_telegram_link': request.is_telegram_link,
            'timestamp': request.timestamp or time.time(),
            'received_at': time.time()
        }
        
        # Append to JSONL file
        with open(links_file, 'a') as f:
            f.write(json.dumps(link_data) + '\n')
        
        # If it's a Telegram link, we could automatically trigger download
        # For now, just acknowledge receipt
        
        return {
            'success': True,
            'message': 'Link received successfully',
            'link': request.url,
            'is_telegram_link': request.is_telegram_link
        }
        
    except Exception as e:
        logger.error(f"Extension send link error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/extension/send-media")
async def extension_send_media(request: ExtensionSendMediaRequest):
    """Receive media URL from browser extension"""
    try:
        logger.info(f"Extension sent {request.media_type}: {request.media_url}")
        
        # Store media in extension_media file
        extension_data_dir = Path('extension_data')
        extension_data_dir.mkdir(exist_ok=True)
        
        media_file = extension_data_dir / 'received_media.jsonl'
        
        media_data = {
            'media_url': request.media_url,
            'media_type': request.media_type,
            'source_url': request.source_url,
            'source_title': request.source_title,
            'timestamp': request.timestamp or time.time(),
            'received_at': time.time()
        }
        
        # Append to JSONL file
        with open(media_file, 'a') as f:
            f.write(json.dumps(media_data) + '\n')
        
        return {
            'success': True,
            'message': f'{request.media_type.capitalize()} URL received successfully',
            'media_url': request.media_url,
            'media_type': request.media_type
        }
        
    except Exception as e:
        logger.error(f"Extension send media error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/extension/send-text")
async def extension_send_text(request: ExtensionSendTextRequest):
    """Receive selected text from browser extension"""
    try:
        logger.info(f"Extension sent text ({len(request.text)} chars, {len(request.telegram_links)} Telegram links)")
        
        # Store text in extension_text file
        extension_data_dir = Path('extension_data')
        extension_data_dir.mkdir(exist_ok=True)
        
        text_file = extension_data_dir / 'received_text.jsonl'
        
        text_data = {
            'text': request.text,
            'source_url': request.source_url,
            'source_title': request.source_title,
            'telegram_links': request.telegram_links,
            'timestamp': request.timestamp or time.time(),
            'received_at': time.time()
        }
        
        # Append to JSONL file
        with open(text_file, 'a') as f:
            f.write(json.dumps(text_data) + '\n')
        
        return {
            'success': True,
            'message': 'Text received successfully',
            'text_length': len(request.text),
            'telegram_links_count': len(request.telegram_links)
        }
        
    except Exception as e:
        logger.error(f"Extension send text error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/extension/received-links")
async def get_received_links(limit: int = 100, offset: int = 0):
    """Get links received from browser extension"""
    try:
        extension_data_dir = Path('extension_data')
        links_file = extension_data_dir / 'received_links.jsonl'
        
        if not links_file.exists():
            return {
                'success': True,
                'links': [],
                'total': 0
            }
        
        # Read all links
        links = []
        with open(links_file, 'r') as f:
            for line in f:
                if line.strip():
                    links.append(json.loads(line))
        
        # Sort by received_at (newest first)
        links.sort(key=lambda x: x.get('received_at', 0), reverse=True)
        
        # Paginate
        total = len(links)
        links = links[offset:offset + limit]
        
        return {
            'success': True,
            'links': links,
            'total': total,
            'limit': limit,
            'offset': offset
        }
        
    except Exception as e:
        logger.error(f"Get received links error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Media Player API
# =============================================================================

@APP.get("/api/media/list")
async def list_media_files():
    """List all media files for preview"""
    try:
        # In a real implementation, this would query the database
        # For now, return mock data structure
        
        media_files = {
            'videos': [],
            'audio': [],
            'images': [],
            'documents': []
        }
        
        # Example: scan downloads directory if exists
        import os
        from pathlib import Path
        
        downloads_dir = Path('downloads')
        if downloads_dir.exists():
            for file_path in downloads_dir.rglob('*'):
                if file_path.is_file():
                    file_info = {
                        'id': str(hash(str(file_path))),
                        'name': file_path.name,
                        'path': str(file_path),
                        'url': f'/api/media/file/{file_path.name}',
                        'size': file_path.stat().st_size,
                        'date': file_path.stat().st_mtime
                    }
                    
                    # Categorize by extension
                    ext = file_path.suffix.lower()
                    if ext in ['.mp4', '.mkv', '.avi', '.mov', '.webm']:
                        file_info['type'] = 'video'
                        media_files['videos'].append(file_info)
                    elif ext in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']:
                        file_info['type'] = 'audio'
                        media_files['audio'].append(file_info)
                    elif ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
                        file_info['type'] = 'image'
                        media_files['images'].append(file_info)
                    elif ext in ['.pdf', '.txt', '.md', '.doc', '.docx']:
                        file_info['type'] = 'document'
                        media_files['documents'].append(file_info)
        
        return {
            'success': True,
            'media': media_files['videos'] + media_files['audio'] + media_files['images'] + media_files['documents'],
            'counts': {
                'videos': len(media_files['videos']),
                'audio': len(media_files['audio']),
                'images': len(media_files['images']),
                'documents': len(media_files['documents'])
            }
        }
        
    except Exception as e:
        logger.error(f"List media files error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Advanced Download Manager API
# =============================================================================

# Download Manager Models
class AddDownloadRequest(BaseModel):
    url: str
    destination: str
    filename: str
    priority: Optional[str] = "NORMAL"  # LOW, NORMAL, HIGH, URGENT
    checksum: Optional[str] = None
    speed_limit: Optional[int] = None  # bytes per second
    connections: Optional[int] = 1

class SetPriorityRequest(BaseModel):
    task_id: str
    priority: str  # LOW, NORMAL, HIGH, URGENT

class SetSpeedLimitRequest(BaseModel):
    task_id: str
    speed_limit: Optional[int]  # bytes per second, None = unlimited

@APP.post("/api/downloads/add")
async def add_download(request: AddDownloadRequest):
    """Add a new download to the queue"""
    try:
        from api.download.manager import get_download_manager, DownloadPriority
        
        manager = get_download_manager()
        
        # Parse priority
        priority = DownloadPriority[request.priority.upper()]
        
        task_id = manager.add_download(
            url=request.url,
            destination=request.destination,
            filename=request.filename,
            priority=priority,
            checksum=request.checksum,
            speed_limit=request.speed_limit,
            connections=request.connections
        )
        
        return {
            'success': True,
            'task_id': task_id,
            'message': f'Download added to queue: {request.filename}'
        }
        
    except Exception as e:
        logger.error(f"Add download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/downloads/list")
async def list_downloads():
    """Get all downloads"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        downloads = manager.get_all_downloads()
        
        return {
            'success': True,
            'downloads': downloads,
            'count': len(downloads)
        }
        
    except Exception as e:
        logger.error(f"List downloads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/downloads/{task_id}")
async def get_download(task_id: str):
    """Get download details"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        download = manager.get_download(task_id)
        
        if not download:
            raise HTTPException(status_code=404, detail="Download not found")
        
        return {
            'success': True,
            'download': download
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/downloads/{task_id}/pause")
async def pause_download(task_id: str):
    """Pause a download"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        success = manager.pause_download(task_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot pause download")
        
        return {
            'success': True,
            'message': 'Download paused'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pause download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/downloads/{task_id}/resume")
async def resume_download(task_id: str):
    """Resume a paused download"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        success = manager.resume_download(task_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot resume download")
        
        return {
            'success': True,
            'message': 'Download resumed'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/downloads/{task_id}/cancel")
async def cancel_download(task_id: str):
    """Cancel a download"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        success = manager.cancel_download(task_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot cancel download")
        
        return {
            'success': True,
            'message': 'Download cancelled'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/downloads/{task_id}/retry")
async def retry_download(task_id: str):
    """Retry a failed download"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        success = manager.retry_failed_download(task_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot retry download")
        
        return {
            'success': True,
            'message': 'Download retry initiated'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Retry download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/downloads/set-priority")
async def set_download_priority(request: SetPriorityRequest):
    """Set download priority"""
    try:
        from api.download.manager import get_download_manager, DownloadPriority
        
        manager = get_download_manager()
        priority = DownloadPriority[request.priority.upper()]
        success = manager.set_priority(request.task_id, priority)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot set priority")
        
        return {
            'success': True,
            'message': f'Priority set to {request.priority}'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set priority error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/downloads/set-speed-limit")
async def set_download_speed_limit(request: SetSpeedLimitRequest):
    """Set download speed limit"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        success = manager.set_speed_limit(request.task_id, request.speed_limit)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot set speed limit")
        
        return {
            'success': True,
            'message': 'Speed limit updated'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set speed limit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/downloads/history")
async def get_download_history(limit: int = 100):
    """Get download history"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        history = manager.get_download_history(limit)
        
        return {
            'success': True,
            'history': history,
            'count': len(history)
        }
        
    except Exception as e:
        logger.error(f"Get download history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/downloads/statistics")
async def get_download_statistics():
    """Get download statistics"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        stats = manager.get_statistics()
        
        return {
            'success': True,
            'statistics': stats
        }
        
    except Exception as e:
        logger.error(f"Get download statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/downloads/{task_id}/speed-history")
async def get_download_speed_history(task_id: str):
    """Get speed history for a download"""
    try:
        from api.download.manager import get_download_manager
        
        manager = get_download_manager()
        speed_history = manager.get_speed_history(task_id)
        
        return {
            'success': True,
            'speed_history': speed_history
        }
        
    except Exception as e:
        logger.error(f"Get speed history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Collaborative Features API
# =============================================================================

# Collaboration Models
class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    owner_id: str

class AddMemberRequest(BaseModel):
    workspace_id: str
    user_id: str
    permission: str  # owner, admin, editor, viewer

class UpdatePermissionRequest(BaseModel):
    workspace_id: str
    user_id: str
    new_permission: str

class CreateCollectionRequest(BaseModel):
    workspace_id: str
    name: str
    created_by: str
    items: Optional[List[dict]] = []

class AddToCollectionRequest(BaseModel):
    collection_id: str
    item: dict
    added_by: str

class AddCommentRequest(BaseModel):
    collection_id: str
    user_id: str
    text: str
    item_id: Optional[str] = None

@APP.post("/api/collaboration/workspace/create")
async def create_workspace(request: CreateWorkspaceRequest):
    """Create new collaborative workspace"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        result = manager.create_workspace(
            request.name,
            request.owner_id,
            request.description
        )
        
        return result
    except Exception as e:
        logger.error(f"Create workspace error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/collaboration/member/add")
async def add_member(request: AddMemberRequest):
    """Add member to workspace"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        result = manager.add_member(
            request.workspace_id,
            request.user_id,
            request.permission,
            request.user_id  # TODO: Get from auth
        )
        
        return result
    except Exception as e:
        logger.error(f"Add member error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/collaboration/permission/update")
async def update_permission(request: UpdatePermissionRequest):
    """Update member permission"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        result = manager.update_permission(
            request.workspace_id,
            request.user_id,
            request.new_permission,
            request.user_id  # TODO: Get from auth
        )
        
        return result
    except Exception as e:
        logger.error(f"Update permission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/collaboration/workspace/{workspace_id}/members")
async def get_workspace_members(workspace_id: str):
    """Get workspace members"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        members = manager.get_workspace_members(workspace_id)
        
        return {
            'success': True,
            'members': members,
            'count': len(members)
        }
    except Exception as e:
        logger.error(f"Get workspace members error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/collaboration/collection/create")
async def create_collection(request: CreateCollectionRequest):
    """Create shared collection"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        result = manager.create_collection(
            request.workspace_id,
            request.name,
            request.created_by,
            request.items
        )
        
        return result
    except Exception as e:
        logger.error(f"Create collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/collaboration/collection/add-item")
async def add_to_collection(request: AddToCollectionRequest):
    """Add item to collection"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        result = manager.add_to_collection(
            request.collection_id,
            request.item,
            request.added_by
        )
        
        return result
    except Exception as e:
        logger.error(f"Add to collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.post("/api/collaboration/comment/add")
async def add_comment(request: AddCommentRequest):
    """Add comment to collection"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        result = manager.add_comment(
            request.collection_id,
            request.user_id,
            request.text,
            request.item_id
        )
        
        return result
    except Exception as e:
        logger.error(f"Add comment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/collaboration/workspace/{workspace_id}/collections")
async def get_workspace_collections(workspace_id: str):
    """Get workspace collections"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager
        
        manager = get_workspace_manager()
        collections = manager.get_workspace_collections(workspace_id)
        
        return {
            'success': True,
            'collections': collections,
            'count': len(collections)
        }
    except Exception as e:
        logger.error(f"Get collections error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@APP.get("/api/collaboration/workspace/{workspace_id}/activity")
async def get_activity_feed(workspace_id: str, limit: int = 50):
    """Get workspace activity feed"""
    try:
        from api.collaboration.workspace_manager import get_workspace_manager

        manager = get_workspace_manager()
        activities = manager.get_activity_feed(workspace_id, limit)

        return {
            'success': True,
            'activities': activities,
            'count': len(activities)
        }
    except Exception as e:
        logger.error(f"Get activity feed error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# Advanced Analytics API Endpoints
# ===================================

class TrackEventRequest(BaseModel):
    """Request model for tracking analytics event"""
    metric_type: str
    user_id: str
    value: float = 1.0
    metadata: Optional[dict] = None
    tags: Optional[List[str]] = None


@APP.post("/api/analytics/track")
async def track_analytics_event(request: TrackEventRequest):
    """Track a new analytics event"""
    try:
        from api.analytics.analytics_manager import analytics_manager

        result = analytics_manager.track_event(
            metric_type=request.metric_type,
            user_id=request.user_id,
            value=request.value,
            metadata=request.metadata,
            tags=request.tags
        )

        return result
    except Exception as e:
        logger.error(f"Track event error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/analytics/events")
async def get_analytics_events(
    time_range: Optional[str] = None,
    metric_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 1000
):
    """Get filtered analytics events"""
    try:
        from api.analytics.analytics_manager import analytics_manager

        result = analytics_manager.get_events(
            time_range=time_range,
            metric_type=metric_type,
            user_id=user_id,
            limit=limit
        )

        return result
    except Exception as e:
        logger.error(f"Get events error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/analytics/report")
async def generate_analytics_report(
    time_range: str = "last_week",
    include_insights: bool = True
):
    """Generate comprehensive analytics report"""
    try:
        from api.analytics.analytics_manager import analytics_manager

        result = analytics_manager.generate_report(
            time_range=time_range,
            include_insights=include_insights
        )

        return result
    except Exception as e:
        logger.error(f"Generate report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/analytics/dashboard")
async def get_dashboard_data(time_range: str = "last_week"):
    """Get dashboard data for visualization"""
    try:
        from api.analytics.analytics_manager import analytics_manager

        result = analytics_manager.get_dashboard_data(time_range=time_range)

        return result
    except Exception as e:
        logger.error(f"Get dashboard data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/analytics/user/{user_id}")
async def get_user_analytics(user_id: str, time_range: str = "last_month"):
    """Get analytics for specific user"""
    try:
        from api.analytics.analytics_manager import analytics_manager

        result = analytics_manager.get_user_analytics(
            user_id=user_id,
            time_range=time_range
        )

        return result
    except Exception as e:
        logger.error(f"Get user analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# Automation & Scripting API Endpoints
# ===================================

class CreateRuleRequest(BaseModel):
    """Request model for creating automation rule"""
    name: str
    description: str
    trigger_type: str
    trigger_config: dict
    actions: List[dict]
    conditions: Optional[List[dict]] = None


class UpdateRuleRequest(BaseModel):
    """Request model for updating automation rule"""
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    trigger_config: Optional[dict] = None
    actions: Optional[List[dict]] = None
    conditions: Optional[List[dict]] = None


class SaveScriptRequest(BaseModel):
    """Request model for saving script"""
    name: str
    content: str


@APP.post("/api/automation/rule/create")
async def create_automation_rule(request: CreateRuleRequest):
    """Create a new automation rule"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.create_rule(
            name=request.name,
            description=request.description,
            trigger_type=request.trigger_type,
            trigger_config=request.trigger_config,
            actions=request.actions,
            conditions=request.conditions
        )

        return result
    except Exception as e:
        logger.error(f"Create rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.put("/api/automation/rule/{rule_id}")
async def update_automation_rule(rule_id: str, request: UpdateRuleRequest):
    """Update an automation rule"""
    try:
        from api.automation.automation_engine import automation_engine

        updates = {k: v for k, v in request.dict().items() if v is not None}
        result = automation_engine.update_rule(rule_id, updates)

        return result
    except Exception as e:
        logger.error(f"Update rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/automation/rule/{rule_id}")
async def delete_automation_rule(rule_id: str):
    """Delete an automation rule"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.delete_rule(rule_id)

        return result
    except Exception as e:
        logger.error(f"Delete rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/automation/rules")
async def get_automation_rules(enabled_only: bool = False):
    """Get all automation rules"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.get_rules(enabled_only=enabled_only)

        return result
    except Exception as e:
        logger.error(f"Get rules error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/automation/rule/{rule_id}")
async def get_automation_rule(rule_id: str):
    """Get a specific automation rule"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.get_rule(rule_id)

        return result
    except Exception as e:
        logger.error(f"Get rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/automation/rule/{rule_id}/execute")
async def execute_automation_rule(rule_id: str):
    """Execute an automation rule manually"""
    try:
        from api.automation.automation_engine import automation_engine

        result = await automation_engine.execute_rule(rule_id, manual=True)

        return result
    except Exception as e:
        logger.error(f"Execute rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/automation/logs")
async def get_automation_logs(rule_id: Optional[str] = None, limit: int = 100):
    """Get automation execution logs"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.get_logs(rule_id=rule_id, limit=limit)

        return result
    except Exception as e:
        logger.error(f"Get logs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/automation/script/save")
async def save_automation_script(request: SaveScriptRequest):
    """Save a custom automation script"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.save_script(
            name=request.name,
            content=request.content
        )

        return result
    except Exception as e:
        logger.error(f"Save script error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/automation/scripts")
async def get_automation_scripts():
    """Get list of saved scripts"""
    try:
        from api.automation.automation_engine import automation_engine

        result = automation_engine.get_scripts()

        return result
    except Exception as e:
        logger.error(f"Get scripts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# OCR & Document Processing API Endpoints
# ===================================

class ProcessDocumentRequest(BaseModel):
    """Request model for document processing"""
    file_path: str
    language: str = "eng"
    options: Optional[dict] = None


class BatchProcessRequest(BaseModel):
    """Request model for batch processing"""
    file_paths: List[str]
    language: str = "eng"
    options: Optional[dict] = None


@APP.post("/api/ocr/process")
async def process_document(request: ProcessDocumentRequest):
    """Process a document and extract text"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.process_document(
            file_path=request.file_path,
            language=request.language,
            options=request.options
        )

        return result
    except Exception as e:
        logger.error(f"Process document error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ocr/batch")
async def batch_process_documents(request: BatchProcessRequest):
    """Process multiple documents in batch"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.batch_process(
            file_paths=request.file_paths,
            language=request.language,
            options=request.options
        )

        return result
    except Exception as e:
        logger.error(f"Batch process error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ocr/analyze/{file_path:path}")
async def analyze_document(file_path: str):
    """Analyze document structure"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.analyze_document(file_path)

        return result
    except Exception as e:
        logger.error(f"Analyze document error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ocr/results")
async def get_ocr_results(limit: int = 100):
    """Get all OCR results"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.get_all_results(limit=limit)

        return result
    except Exception as e:
        logger.error(f"Get OCR results error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ocr/result/{result_id}")
async def get_ocr_result(result_id: str):
    """Get a specific OCR result"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.get_result(result_id)

        return result
    except Exception as e:
        logger.error(f"Get OCR result error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/ocr/result/{result_id}")
async def delete_ocr_result(result_id: str):
    """Delete an OCR result"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.delete_result(result_id)

        return result
    except Exception as e:
        logger.error(f"Delete OCR result error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ocr/search")
async def search_ocr_results(query: str, limit: int = 50):
    """Search in OCR extracted text"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.search_in_results(query=query, limit=limit)

        return result
    except Exception as e:
        logger.error(f"Search OCR results error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ocr/statistics")
async def get_ocr_statistics():
    """Get OCR processing statistics"""
    try:
        from api.ocr.ocr_processor import ocr_processor

        result = ocr_processor.get_statistics()

        return result
    except Exception as e:
        logger.error(f"Get OCR statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================================
# Voice Control API Endpoints
# ===================================

class ProcessVoiceCommandRequest(BaseModel):
    """Request model for processing voice command"""
    text: str


class TextToSpeechRequest(BaseModel):
    """Request model for text-to-speech"""
    text: str
    language: str = "en"
    voice: str = "female"
    speed: float = 1.0


@APP.post("/api/voice/command")
async def process_voice_command(request: ProcessVoiceCommandRequest):
    """Process a voice command from text"""
    try:
        from api.voice.voice_controller import voice_controller

        result = voice_controller.process_voice_command(request.text)

        return result
    except Exception as e:
        logger.error(f"Process voice command error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/voice/tts")
async def text_to_speech(request: TextToSpeechRequest):
    """Convert text to speech"""
    try:
        from api.voice.voice_controller import voice_controller

        result = voice_controller.text_to_speech(
            text=request.text,
            language=request.language,
            voice=request.voice,
            speed=request.speed
        )

        return result
    except Exception as e:
        logger.error(f"Text to speech error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/voice/commands/available")
async def get_available_commands():
    """Get list of available voice commands"""
    try:
        from api.voice.voice_controller import voice_controller

        result = voice_controller.get_available_commands()

        return result
    except Exception as e:
        logger.error(f"Get available commands error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/voice/commands/history")
async def get_command_history(limit: int = 100):
    """Get voice command history"""
    try:
        from api.voice.voice_controller import voice_controller

        result = voice_controller.get_command_history(limit=limit)

        return result
    except Exception as e:
        logger.error(f"Get command history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/voice/tts/history")
async def get_tts_history(limit: int = 100):
    """Get TTS request history"""
    try:
        from api.voice.voice_controller import voice_controller

        result = voice_controller.get_tts_history(limit=limit)

        return result
    except Exception as e:
        logger.error(f"Get TTS history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/voice/statistics")
async def get_voice_statistics():
    """Get voice control statistics"""
    try:
        from api.voice.voice_controller import voice_controller

        result = voice_controller.get_statistics()

        return result
    except Exception as e:
        logger.error(f"Get voice statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TELEGRAM PREMIUM API ENDPOINTS
# ============================================================================

class CreateSubscriptionRequest(BaseModel):
    """Request model for creating subscription"""
    user_id: str
    tier: str
    duration_days: int = 30
    payment_method: str = "credit_card"
    auto_renew: bool = True


class UpgradeSubscriptionRequest(BaseModel):
    """Request model for upgrading subscription"""
    user_id: str
    new_tier: str


class TranscribeVoiceRequest(BaseModel):
    """Request model for voice transcription"""
    file_path: str
    language: str = "en-US"
    user_id: Optional[str] = None


class ValidateFileSizeRequest(BaseModel):
    """Request model for file size validation"""
    user_id: str
    file_size_mb: int


@APP.get("/api/premium/tiers")
async def get_premium_tiers():
    """Get all available premium tiers"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_all_tiers()
        return result
    except Exception as e:
        logger.error(f"Get premium tiers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/tiers/{tier}")
async def get_tier_limits(tier: str):
    """Get limits for a specific tier"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_tier_limits(tier)
        return result
    except Exception as e:
        logger.error(f"Get tier limits error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/premium/subscriptions")
async def create_subscription(request: CreateSubscriptionRequest):
    """Create a new premium subscription"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.create_subscription(
            user_id=request.user_id,
            tier=request.tier,
            duration_days=request.duration_days,
            payment_method=request.payment_method,
            auto_renew=request.auto_renew
        )
        return result
    except Exception as e:
        logger.error(f"Create subscription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/subscriptions/{user_id}")
async def get_user_subscription(user_id: str):
    """Get user's current subscription"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_user_subscription(user_id)
        return result
    except Exception as e:
        logger.error(f"Get user subscription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/premium/subscriptions/upgrade")
async def upgrade_subscription(request: UpgradeSubscriptionRequest):
    """Upgrade user's subscription to a higher tier"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.upgrade_subscription(request.user_id, request.new_tier)
        return result
    except Exception as e:
        logger.error(f"Upgrade subscription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/premium/subscriptions/{user_id}")
async def cancel_subscription(user_id: str):
    """Cancel user's subscription"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.cancel_subscription(user_id)
        return result
    except Exception as e:
        logger.error(f"Cancel subscription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/features/{user_id}/{feature}")
async def check_feature_access(user_id: str, feature: str):
    """Check if user has access to a specific feature"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.check_feature_access(user_id, feature)
        return result
    except Exception as e:
        logger.error(f"Check feature access error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/premium/transcribe")
async def transcribe_voice_message(request: TranscribeVoiceRequest):
    """Transcribe a voice message to text"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.transcribe_voice_message(
            file_path=request.file_path,
            language=request.language,
            user_id=request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"Transcribe voice message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/transcriptions/{transcription_id}")
async def get_transcription(transcription_id: str):
    """Get a transcription by ID"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_transcription(transcription_id)
        return result
    except Exception as e:
        logger.error(f"Get transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/transcriptions")
async def get_all_transcriptions(user_id: Optional[str] = None, limit: int = 50):
    """Get all transcriptions"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_all_transcriptions(user_id=user_id, limit=limit)
        return result
    except Exception as e:
        logger.error(f"Get all transcriptions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/premium/validate-file-size")
async def validate_file_size(request: ValidateFileSizeRequest):
    """Validate if user can download/upload a file of given size"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.validate_file_size(request.user_id, request.file_size_mb)
        return result
    except Exception as e:
        logger.error(f"Validate file size error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/usage/{user_id}")
async def get_usage_statistics(user_id: str):
    """Get usage statistics for a user"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_usage_statistics(user_id)
        return result
    except Exception as e:
        logger.error(f"Get usage statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/premium/statistics")
async def get_premium_statistics():
    """Get overall premium statistics"""
    try:
        from api.premium.premium_manager import premium_manager
        result = premium_manager.get_premium_statistics()
        return result
    except Exception as e:
        logger.error(f"Get premium statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CLOUD STORAGE API ENDPOINTS
# ============================================================================

class AddCloudAccountRequest(BaseModel):
    """Request model for adding cloud account"""
    user_id: str
    provider: str
    account_name: str
    email: str
    access_token: str
    refresh_token: Optional[str] = None
    storage_quota: int = 15 * 1024 * 1024 * 1024  # 15GB


class UpdateCloudAccountRequest(BaseModel):
    """Request model for updating cloud account"""
    account_name: Optional[str] = None
    sync_enabled: Optional[bool] = None
    auto_upload: Optional[bool] = None
    is_active: Optional[bool] = None


class UploadFileRequest(BaseModel):
    """Request model for uploading file"""
    account_id: str
    local_path: str
    remote_path: str
    metadata: Optional[Dict[str, Any]] = None


class DownloadFileRequest(BaseModel):
    """Request model for downloading file"""
    file_id: str
    local_path: str


class SyncFolderRequest(BaseModel):
    """Request model for syncing folder"""
    account_id: str
    local_folder: str
    remote_folder: str


class ResolveConflictRequest(BaseModel):
    """Request model for resolving conflict"""
    conflict_id: str
    resolution: str


@APP.post("/api/cloud/accounts")
async def add_cloud_account(request: AddCloudAccountRequest):
    """Add a new cloud storage account"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.add_account(
            user_id=request.user_id,
            provider=request.provider,
            account_name=request.account_name,
            email=request.email,
            access_token=request.access_token,
            refresh_token=request.refresh_token,
            storage_quota=request.storage_quota
        )
        return result
    except Exception as e:
        logger.error(f"Add cloud account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/cloud/accounts")
async def get_cloud_accounts(user_id: Optional[str] = None):
    """Get all cloud storage accounts"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.get_accounts(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Get cloud accounts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/cloud/accounts/{account_id}")
async def get_cloud_account(account_id: str):
    """Get cloud storage account by ID"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.get_account(account_id)
        return result
    except Exception as e:
        logger.error(f"Get cloud account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.patch("/api/cloud/accounts/{account_id}")
async def update_cloud_account(account_id: str, request: UpdateCloudAccountRequest):
    """Update cloud storage account settings"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        updates = {k: v for k, v in request.dict().items() if v is not None}
        result = cloud_storage_manager.update_account(account_id, **updates)
        return result
    except Exception as e:
        logger.error(f"Update cloud account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/cloud/accounts/{account_id}")
async def delete_cloud_account(account_id: str):
    """Delete a cloud storage account"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.delete_account(account_id)
        return result
    except Exception as e:
        logger.error(f"Delete cloud account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/cloud/upload")
async def upload_file_to_cloud(request: UploadFileRequest):
    """Upload file to cloud storage"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.upload_file(
            account_id=request.account_id,
            local_path=request.local_path,
            remote_path=request.remote_path,
            metadata=request.metadata
        )
        return result
    except Exception as e:
        logger.error(f"Upload file error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/cloud/download")
async def download_file_from_cloud(request: DownloadFileRequest):
    """Download file from cloud storage"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.download_file(
            file_id=request.file_id,
            local_path=request.local_path
        )
        return result
    except Exception as e:
        logger.error(f"Download file error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/cloud/sync-folder")
async def sync_folder(request: SyncFolderRequest):
    """Synchronize an entire folder"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.sync_folder(
            account_id=request.account_id,
            local_folder=request.local_folder,
            remote_folder=request.remote_folder
        )
        return result
    except Exception as e:
        logger.error(f"Sync folder error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/cloud/files")
async def get_cloud_files(
    account_id: Optional[str] = None,
    sync_status: Optional[str] = None
):
    """Get cloud files"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.get_files(
            account_id=account_id,
            sync_status=sync_status
        )
        return result
    except Exception as e:
        logger.error(f"Get cloud files error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/cloud/tasks")
async def get_sync_tasks(
    account_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get synchronization tasks"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.get_sync_tasks(
            account_id=account_id,
            status=status
        )
        return result
    except Exception as e:
        logger.error(f"Get sync tasks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/cloud/conflicts")
async def detect_conflicts():
    """Detect synchronization conflicts"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.detect_conflicts()
        return result
    except Exception as e:
        logger.error(f"Detect conflicts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/cloud/conflicts/resolve")
async def resolve_conflict(request: ResolveConflictRequest):
    """Resolve a synchronization conflict"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.resolve_conflict(
            conflict_id=request.conflict_id,
            resolution=request.resolution
        )
        return result
    except Exception as e:
        logger.error(f"Resolve conflict error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/cloud/statistics")
async def get_cloud_statistics(user_id: Optional[str] = None):
    """Get cloud storage statistics"""
    try:
        from api.cloud.cloud_storage_manager import cloud_storage_manager
        result = cloud_storage_manager.get_statistics(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Get cloud statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REAL-TIME COLLABORATION API ENDPOINTS
# ============================================================================

class UpdatePresenceRequest(BaseModel):
    """Request model for updating presence"""
    user_id: str
    username: str
    status: str
    current_session: Optional[str] = None


class CreateRoomRequest(BaseModel):
    """Request model for creating room"""
    name: str
    description: str
    room_type: str
    created_by: str
    members: Optional[List[str]] = None


class SendMessageRequest(BaseModel):
    """Request model for sending message"""
    room_id: str
    user_id: str
    username: str
    content: str
    message_type: str = "text"
    attachments: Optional[List[Dict[str, Any]]] = None
    reply_to: Optional[str] = None
    mentions: Optional[List[str]] = None


class AddReactionRequest(BaseModel):
    """Request model for adding reaction"""
    message_id: str
    user_id: str
    emoji: str


class CreateSessionRequest(BaseModel):
    """Request model for creating session"""
    name: str
    resource_type: str
    resource_id: str
    created_by: str


class UpdateCursorRequest(BaseModel):
    """Request model for updating cursor"""
    session_id: str
    user_id: str
    cursor_data: Dict[str, Any]


@APP.post("/api/collaboration/presence")
async def update_presence(request: UpdatePresenceRequest):
    """Update user presence"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.update_presence(
            user_id=request.user_id,
            username=request.username,
            status=request.status,
            current_session=request.current_session
        )
        return result
    except Exception as e:
        logger.error(f"Update presence error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/collaboration/presence")
async def get_presence(user_id: Optional[str] = None):
    """Get user presence"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.get_presence(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Get presence error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/rooms/{room_id}/join")
async def join_room(room_id: str, user_id: str):
    """Join a chat room"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.join_room(user_id=user_id, room_id=room_id)
        return result
    except Exception as e:
        logger.error(f"Join room error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/rooms/{room_id}/leave")
async def leave_room(room_id: str, user_id: str):
    """Leave a chat room"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.leave_room(user_id=user_id, room_id=room_id)
        return result
    except Exception as e:
        logger.error(f"Leave room error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/rooms")
async def create_room(request: CreateRoomRequest):
    """Create a chat room"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.create_room(
            name=request.name,
            description=request.description,
            room_type=request.room_type,
            created_by=request.created_by,
            members=request.members
        )
        return result
    except Exception as e:
        logger.error(f"Create room error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/collaboration/rooms")
async def get_rooms(user_id: Optional[str] = None):
    """Get chat rooms"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.get_rooms(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Get rooms error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/rooms/{room_id}/members")
async def add_room_member(room_id: str, user_id: str):
    """Add member to room"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.add_room_member(room_id=room_id, user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Add room member error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/messages")
async def send_message(request: SendMessageRequest):
    """Send a chat message"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.send_message(
            room_id=request.room_id,
            user_id=request.user_id,
            username=request.username,
            content=request.content,
            message_type=request.message_type,
            attachments=request.attachments,
            reply_to=request.reply_to,
            mentions=request.mentions
        )
        return result
    except Exception as e:
        logger.error(f"Send message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/collaboration/messages")
async def get_messages(room_id: str, limit: int = 50, before: Optional[str] = None):
    """Get messages from a room"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.get_messages(
            room_id=room_id,
            limit=limit,
            before=before
        )
        return result
    except Exception as e:
        logger.error(f"Get messages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/messages/reactions")
async def add_reaction(request: AddReactionRequest):
    """Add reaction to message"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.add_reaction(
            message_id=request.message_id,
            user_id=request.user_id,
            emoji=request.emoji
        )
        return result
    except Exception as e:
        logger.error(f"Add reaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/collaboration/activities")
async def get_activities(room_id: Optional[str] = None, limit: int = 50):
    """Get activity feed"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.get_activities(room_id=room_id, limit=limit)
        return result
    except Exception as e:
        logger.error(f"Get activities error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/collaboration/notifications")
async def get_notifications(user_id: str, unread_only: bool = False):
    """Get user notifications"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.get_notifications(
            user_id=user_id,
            unread_only=unread_only
        )
        return result
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.patch("/api/collaboration/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.mark_notification_read(notification_id=notification_id)
        return result
    except Exception as e:
        logger.error(f"Mark notification read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/sessions")
async def create_session(request: CreateSessionRequest):
    """Create collaborative session"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.create_session(
            name=request.name,
            resource_type=request.resource_type,
            resource_id=request.resource_id,
            created_by=request.created_by
        )
        return result
    except Exception as e:
        logger.error(f"Create session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/sessions/{session_id}/join")
async def join_session(session_id: str, user_id: str):
    """Join collaborative session"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.join_session(session_id=session_id, user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Join session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/collaboration/sessions/cursor")
async def update_cursor(request: UpdateCursorRequest):
    """Update user cursor position"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.update_cursor(
            session_id=request.session_id,
            user_id=request.user_id,
            cursor_data=request.cursor_data
        )
        return result
    except Exception as e:
        logger.error(f"Update cursor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/collaboration/statistics")
async def get_collaboration_statistics():
    """Get collaboration statistics"""
    try:
        from api.collaboration.realtime_manager import realtime_manager
        result = realtime_manager.get_statistics()
        return result
    except Exception as e:
        logger.error(f"Get collaboration statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SECURITY & ENCRYPTION API ENDPOINTS
# ============================================================================

class EncryptDataRequest(BaseModel):
    """Request model for encrypting data"""
    plaintext: str
    algorithm: str = "aes_256_gcm"


class DecryptDataRequest(BaseModel):
    """Request model for decrypting data"""
    encrypted_data: Dict[str, Any]
    key: str


class HashPasswordRequest(BaseModel):
    """Request model for hashing password"""
    password: str


class VerifyPasswordRequest(BaseModel):
    """Request model for verifying password"""
    password: str
    hash_string: str


class CreateAPIKeyRequest(BaseModel):
    """Request model for creating API key"""
    name: str
    user_id: str
    permissions: List[str]
    rate_limit: int = 1000
    expires_days: Optional[int] = None


class ValidateAPIKeyRequest(BaseModel):
    """Request model for validating API key"""
    key: str


class AssignRoleRequest(BaseModel):
    """Request model for assigning role"""
    user_id: str
    username: str
    role: str


class CheckPermissionRequest(BaseModel):
    """Request model for checking permission"""
    user_id: str
    permission: str


class Enable2FARequest(BaseModel):
    """Request model for enabling 2FA"""
    user_id: str


class Verify2FARequest(BaseModel):
    """Request model for verifying 2FA token"""
    user_id: str
    token: str


class CreateSessionRequest(BaseModel):
    """Request model for creating session"""
    user_id: str
    ip_address: str
    user_agent: str
    duration_hours: int = 24


class ValidateSessionRequest(BaseModel):
    """Request model for validating session"""
    token: str


@APP.post("/api/security/encrypt")
async def encrypt_data(request: EncryptDataRequest):
    """Encrypt data"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.encrypt_data(
            plaintext=request.plaintext,
            algorithm=request.algorithm
        )
        return result
    except Exception as e:
        logger.error(f"Encrypt data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/decrypt")
async def decrypt_data(request: DecryptDataRequest):
    """Decrypt data"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.decrypt_data(
            encrypted_data=request.encrypted_data,
            key=request.key
        )
        return result
    except Exception as e:
        logger.error(f"Decrypt data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/password/hash")
async def hash_password(request: HashPasswordRequest):
    """Hash password"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.hash_password(password=request.password)
        return result
    except Exception as e:
        logger.error(f"Hash password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/password/verify")
async def verify_password(request: VerifyPasswordRequest):
    """Verify password against hash"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.verify_password(
            password=request.password,
            hash_string=request.hash_string
        )
        return result
    except Exception as e:
        logger.error(f"Verify password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/api-keys")
async def create_api_key(request: CreateAPIKeyRequest):
    """Create an API key"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.create_api_key(
            name=request.name,
            user_id=request.user_id,
            permissions=request.permissions,
            rate_limit=request.rate_limit,
            expires_days=request.expires_days
        )
        return result
    except Exception as e:
        logger.error(f"Create API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/api-keys/validate")
async def validate_api_key(request: ValidateAPIKeyRequest):
    """Validate an API key"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.validate_api_key(key=request.key)
        return result
    except Exception as e:
        logger.error(f"Validate API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/security/api-keys/{key_id}")
async def revoke_api_key(key_id: str, user_id: str):
    """Revoke an API key"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.revoke_api_key(key_id=key_id, user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Revoke API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/security/api-keys")
async def get_api_keys(user_id: Optional[str] = None):
    """Get API keys"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.get_api_keys(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Get API keys error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/roles/assign")
async def assign_role(request: AssignRoleRequest):
    """Assign role to user"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.assign_role(
            user_id=request.user_id,
            username=request.username,
            role=request.role
        )
        return result
    except Exception as e:
        logger.error(f"Assign role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/permissions/check")
async def check_permission(request: CheckPermissionRequest):
    """Check if user has permission"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.check_permission(
            user_id=request.user_id,
            permission=request.permission
        )
        return result
    except Exception as e:
        logger.error(f"Check permission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/security/roles/{user_id}")
async def get_user_role(user_id: str):
    """Get user role"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.get_user_role(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Get user role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/security/audit-logs")
async def get_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100
):
    """Get audit logs"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.get_audit_logs(
            user_id=user_id,
            action=action,
            limit=limit
        )
        return result
    except Exception as e:
        logger.error(f"Get audit logs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/2fa/enable")
async def enable_2fa(request: Enable2FARequest):
    """Enable 2FA for user"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.enable_2fa(user_id=request.user_id)
        return result
    except Exception as e:
        logger.error(f"Enable 2FA error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/2fa/verify")
async def verify_2fa_token(request: Verify2FARequest):
    """Verify 2FA token"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.verify_2fa_token(
            user_id=request.user_id,
            token=request.token
        )
        return result
    except Exception as e:
        logger.error(f"Verify 2FA token error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/security/2fa/{user_id}")
async def disable_2fa(user_id: str):
    """Disable 2FA for user"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.disable_2fa(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"Disable 2FA error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a user session"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.create_session(
            user_id=request.user_id,
            ip_address=request.ip_address,
            user_agent=request.user_agent,
            duration_hours=request.duration_hours
        )
        return result
    except Exception as e:
        logger.error(f"Create session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/security/sessions/validate")
async def validate_session(request: ValidateSessionRequest):
    """Validate a session token"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.validate_session(token=request.token)
        return result
    except Exception as e:
        logger.error(f"Validate session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/security/sessions/{session_id}")
async def revoke_session(session_id: str):
    """Revoke a session"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.revoke_session(session_id=session_id)
        return result
    except Exception as e:
        logger.error(f"Revoke session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/security/statistics")
async def get_security_statistics():
    """Get security statistics"""
    try:
        from api.security.security_manager import security_manager
        result = security_manager.get_statistics()
        return result
    except Exception as e:
        logger.error(f"Get security statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== Machine Learning Integration Endpoints =====

class CreateModelRequest(BaseModel):
    name: str
    description: str
    model_type: str
    framework: str
    user_id: str
    input_shape: Optional[List[int]] = []
    output_shape: Optional[List[int]] = []
    num_parameters: Optional[int] = 0
    model_size_mb: Optional[float] = 0.0
    tags: Optional[List[str]] = []
    metadata: Optional[Dict] = {}


class UpdateModelRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict] = None
    metrics: Optional[Dict] = None
    is_deployed: Optional[bool] = None
    endpoint_url: Optional[str] = None
    deployment_config: Optional[Dict] = None


class CreateTrainingJobRequest(BaseModel):
    model_id: str
    name: str
    dataset_path: str
    user_id: str
    num_epochs: Optional[int] = 10
    batch_size: Optional[int] = 32
    learning_rate: Optional[float] = 0.001
    optimizer: Optional[str] = "adam"
    loss_function: Optional[str] = "categorical_crossentropy"
    gpu_enabled: Optional[bool] = False
    num_gpus: Optional[int] = 0
    memory_mb: Optional[int] = 2048


class PredictRequest(BaseModel):
    model_id: str
    input_data: Any
    user_id: str
    batch_size: Optional[int] = 1
    confidence_threshold: Optional[float] = 0.5
    max_results: Optional[int] = 5


class BatchPredictRequest(BaseModel):
    model_id: str
    input_batch: List[Any]
    user_id: str


class CreateDatasetRequest(BaseModel):
    name: str
    description: str
    dataset_type: str
    user_id: str
    num_samples: Optional[int] = 0
    num_features: Optional[int] = 0
    num_classes: Optional[int] = 0
    size_mb: Optional[float] = 0.0
    train_split: Optional[float] = 0.7
    val_split: Optional[float] = 0.15
    test_split: Optional[float] = 0.15
    labels: Optional[List[str]] = []
    preprocessing_steps: Optional[List[str]] = []


class DeployModelRequest(BaseModel):
    model_id: str
    config: Dict


class CreateAutoMLRequest(BaseModel):
    name: str
    task_type: str
    metric_to_optimize: str
    model_types: Optional[List[str]] = []
    hyperparameters: Optional[Dict] = {}
    max_trials: Optional[int] = 50
    max_time_minutes: Optional[int] = 60
    max_models: Optional[int] = 10


@APP.post("/api/ml/models")
async def create_ml_model(request: CreateModelRequest):
    """Create a new ML model"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.create_model(
            name=request.name,
            description=request.description,
            model_type=request.model_type,
            framework=request.framework,
            user_id=request.user_id,
            input_shape=request.input_shape,
            output_shape=request.output_shape,
            num_parameters=request.num_parameters,
            model_size_mb=request.model_size_mb,
            tags=request.tags,
            metadata=request.metadata
        )
        return result
    except Exception as e:
        logger.error(f"Create ML model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ml/models/{model_id}")
async def get_ml_model(model_id: str):
    """Get ML model by ID"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.get_model(model_id)
        return result
    except Exception as e:
        logger.error(f"Get ML model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ml/models")
async def list_ml_models(user_id: Optional[str] = None,
                        model_type: Optional[str] = None,
                        status: Optional[str] = None):
    """List ML models"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.list_models(user_id=user_id, model_type=model_type, status=status)
        return result
    except Exception as e:
        logger.error(f"List ML models error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.put("/api/ml/models/{model_id}")
async def update_ml_model(model_id: str, request: UpdateModelRequest):
    """Update ML model"""
    try:
        from api.ml.ml_manager import ml_manager
        updates = {k: v for k, v in request.dict().items() if v is not None}
        result = ml_manager.update_model(model_id, **updates)
        return result
    except Exception as e:
        logger.error(f"Update ML model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/ml/models/{model_id}")
async def delete_ml_model(model_id: str):
    """Delete ML model"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.delete_model(model_id)
        return result
    except Exception as e:
        logger.error(f"Delete ML model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/training-jobs")
async def create_training_job(request: CreateTrainingJobRequest):
    """Create a training job"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.create_training_job(
            model_id=request.model_id,
            name=request.name,
            dataset_path=request.dataset_path,
            user_id=request.user_id,
            num_epochs=request.num_epochs,
            batch_size=request.batch_size,
            learning_rate=request.learning_rate,
            optimizer=request.optimizer,
            loss_function=request.loss_function,
            gpu_enabled=request.gpu_enabled,
            num_gpus=request.num_gpus,
            memory_mb=request.memory_mb
        )
        return result
    except Exception as e:
        logger.error(f"Create training job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/training-jobs/{job_id}/start")
async def start_training_job(job_id: str):
    """Start a training job"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.start_training(job_id)
        return result
    except Exception as e:
        logger.error(f"Start training job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/training-jobs/{job_id}/stop")
async def stop_training_job(job_id: str):
    """Stop a training job"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.stop_training(job_id)
        return result
    except Exception as e:
        logger.error(f"Stop training job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ml/training-jobs/{job_id}")
async def get_training_job(job_id: str):
    """Get training job details"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.get_training_job(job_id)
        return result
    except Exception as e:
        logger.error(f"Get training job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ml/training-jobs")
async def list_training_jobs(model_id: Optional[str] = None,
                             status: Optional[str] = None):
    """List training jobs"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.list_training_jobs(model_id=model_id, status=status)
        return result
    except Exception as e:
        logger.error(f"List training jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/predict")
async def ml_predict(request: PredictRequest):
    """Run model inference"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.predict(
            model_id=request.model_id,
            input_data=request.input_data,
            user_id=request.user_id,
            batch_size=request.batch_size,
            confidence_threshold=request.confidence_threshold,
            max_results=request.max_results
        )
        return result
    except Exception as e:
        logger.error(f"ML predict error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/predict/batch")
async def ml_batch_predict(request: BatchPredictRequest):
    """Run batch inference"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.batch_predict(
            model_id=request.model_id,
            input_batch=request.input_batch,
            user_id=request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"ML batch predict error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/datasets")
async def create_dataset(request: CreateDatasetRequest):
    """Create a dataset"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.create_dataset(
            name=request.name,
            description=request.description,
            dataset_type=request.dataset_type,
            user_id=request.user_id,
            num_samples=request.num_samples,
            num_features=request.num_features,
            num_classes=request.num_classes,
            size_mb=request.size_mb,
            train_split=request.train_split,
            val_split=request.val_split,
            test_split=request.test_split,
            labels=request.labels,
            preprocessing_steps=request.preprocessing_steps
        )
        return result
    except Exception as e:
        logger.error(f"Create dataset error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ml/datasets")
async def list_datasets(user_id: Optional[str] = None):
    """List datasets"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.list_datasets(user_id=user_id)
        return result
    except Exception as e:
        logger.error(f"List datasets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/deploy")
async def deploy_model(request: DeployModelRequest):
    """Deploy a model"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.deploy_model(request.model_id, request.config)
        return result
    except Exception as e:
        logger.error(f"Deploy model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/undeploy/{model_id}")
async def undeploy_model(model_id: str):
    """Undeploy a model"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.undeploy_model(model_id)
        return result
    except Exception as e:
        logger.error(f"Undeploy model error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/automl")
async def create_automl(request: CreateAutoMLRequest):
    """Create AutoML configuration"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.create_automl_config(
            name=request.name,
            task_type=request.task_type,
            metric_to_optimize=request.metric_to_optimize,
            model_types=request.model_types,
            hyperparameters=request.hyperparameters,
            max_trials=request.max_trials,
            max_time_minutes=request.max_time_minutes,
            max_models=request.max_models
        )
        return result
    except Exception as e:
        logger.error(f"Create AutoML error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/ml/automl/{config_id}/start")
async def start_automl(config_id: str):
    """Start AutoML search"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.start_automl(config_id)
        return result
    except Exception as e:
        logger.error(f"Start AutoML error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/ml/statistics")
async def get_ml_statistics():
    """Get ML statistics"""
    try:
        from api.ml.ml_manager import ml_manager
        result = ml_manager.get_statistics()
        return result
    except Exception as e:
        logger.error(f"Get ML statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== Plugin System & Extensions Endpoints =====

class InstallPluginRequest(BaseModel):
    manifest: Dict
    user_id: str
    config: Optional[Dict] = {}


class UpdatePluginRequest(BaseModel):
    manifest: Dict
    user_id: str


class ConfigurePluginRequest(BaseModel):
    config: Dict
    user_id: str


class RegisterHookRequest(BaseModel):
    plugin_id: str
    hook_name: str
    priority: Optional[int] = 100


class ExecuteHookRequest(BaseModel):
    hook_name: str
    data: Dict


@APP.post("/api/plugins/install")
async def install_plugin(request: InstallPluginRequest):
    """Install a plugin"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.install_plugin(
            manifest=request.manifest,
            user_id=request.user_id,
            config=request.config
        )
        return result
    except Exception as e:
        logger.error(f"Install plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/{plugin_id}/uninstall")
async def uninstall_plugin(plugin_id: str, user_id: str):
    """Uninstall a plugin"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.uninstall_plugin(plugin_id, user_id)
        return result
    except Exception as e:
        logger.error(f"Uninstall plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/{plugin_id}/enable")
async def enable_plugin(plugin_id: str, user_id: str):
    """Enable a plugin"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.enable_plugin(plugin_id, user_id)
        return result
    except Exception as e:
        logger.error(f"Enable plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/{plugin_id}/disable")
async def disable_plugin(plugin_id: str, user_id: str):
    """Disable a plugin"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.disable_plugin(plugin_id, user_id)
        return result
    except Exception as e:
        logger.error(f"Disable plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.put("/api/plugins/{plugin_id}")
async def update_plugin(plugin_id: str, request: UpdatePluginRequest):
    """Update a plugin"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.update_plugin(plugin_id, request.manifest, request.user_id)
        return result
    except Exception as e:
        logger.error(f"Update plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/{plugin_id}/configure")
async def configure_plugin(plugin_id: str, request: ConfigurePluginRequest):
    """Configure a plugin"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.configure_plugin(plugin_id, request.config, request.user_id)
        return result
    except Exception as e:
        logger.error(f"Configure plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/plugins/{plugin_id}")
async def get_plugin(plugin_id: str):
    """Get plugin details"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.get_plugin(plugin_id)
        return result
    except Exception as e:
        logger.error(f"Get plugin error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/plugins")
async def list_plugins(category: Optional[str] = None,
                      status: Optional[str] = None,
                      enabled: Optional[bool] = None):
    """List plugins"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.list_plugins(category=category, status=status, enabled=enabled)
        return result
    except Exception as e:
        logger.error(f"List plugins error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/hooks/register")
async def register_hook(request: RegisterHookRequest):
    """Register plugin to a hook"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.register_hook(
            plugin_id=request.plugin_id,
            hook_name=request.hook_name,
            priority=request.priority
        )
        return result
    except Exception as e:
        logger.error(f"Register hook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/hooks/unregister")
async def unregister_hook(plugin_id: str, hook_name: str):
    """Unregister plugin from a hook"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.unregister_hook(plugin_id, hook_name)
        return result
    except Exception as e:
        logger.error(f"Unregister hook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/plugins/hooks")
async def list_hooks():
    """List all available hooks"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.list_hooks()
        return result
    except Exception as e:
        logger.error(f"List hooks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/plugins/hooks/execute")
async def execute_hook(request: ExecuteHookRequest):
    """Execute a hook"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.execute_hook(request.hook_name, request.data)
        return result
    except Exception as e:
        logger.error(f"Execute hook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/plugins/marketplace")
async def browse_marketplace(category: Optional[str] = None,
                            featured: Optional[bool] = None,
                            query: Optional[str] = None):
    """Browse plugin marketplace"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.browse_marketplace(category=category, featured=featured, query=query)
        return result
    except Exception as e:
        logger.error(f"Browse marketplace error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/plugins/statistics")
async def get_plugin_statistics():
    """Get plugin statistics"""
    try:
        from api.plugins.plugin_manager import plugin_manager
        result = plugin_manager.get_statistics()
        return result
    except Exception as e:
        logger.error(f"Get plugin statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== Advanced Media Processing Endpoints =====

class TranscodeVideoRequest(BaseModel):
    input_file: str
    profile_id: str
    user_id: str
    input_size_mb: Optional[float] = 100.0


class GenerateThumbnailRequest(BaseModel):
    video_file: str
    timestamp: float
    user_id: str


class OptimizeImageRequest(BaseModel):
    input_file: str
    optimization_id: str
    user_id: str


class CreateImageOptimizationRequest(BaseModel):
    name: str
    format: str
    quality: int
    max_width: Optional[int] = 1920
    max_height: Optional[int] = 1080
    strip_metadata: Optional[bool] = True
    progressive: Optional[bool] = True


class ConvertAudioRequest(BaseModel):
    input_file: str
    codec: str
    bitrate: int
    user_id: str


class CreateBatchOperationRequest(BaseModel):
    name: str
    media_type: str
    files: List[str]
    operation: str
    settings: Dict
    user_id: str


@APP.post("/api/media/video/transcode")
async def transcode_video(request: TranscodeVideoRequest):
    """Transcode video"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.transcode_video(
            input_file=request.input_file,
            profile_id=request.profile_id,
            user_id=request.user_id,
            input_size_mb=request.input_size_mb
        )
        return result
    except Exception as e:
        logger.error(f"Transcode video error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/video/thumbnail")
async def generate_thumbnail(request: GenerateThumbnailRequest):
    """Generate video thumbnail"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.generate_thumbnail(
            video_file=request.video_file,
            timestamp=request.timestamp,
            user_id=request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"Generate thumbnail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/image/optimize")
async def optimize_image(request: OptimizeImageRequest):
    """Optimize image"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.optimize_image(
            input_file=request.input_file,
            optimization_id=request.optimization_id,
            user_id=request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"Optimize image error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/image/optimizations")
async def create_image_optimization(request: CreateImageOptimizationRequest):
    """Create image optimization profile"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.create_image_optimization(
            name=request.name,
            format=request.format,
            quality=request.quality,
            max_width=request.max_width,
            max_height=request.max_height,
            strip_metadata=request.strip_metadata,
            progressive=request.progressive
        )
        return result
    except Exception as e:
        logger.error(f"Create image optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/media/image/optimizations")
async def list_image_optimizations():
    """List image optimization profiles"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.list_image_optimizations()
        return result
    except Exception as e:
        logger.error(f"List image optimizations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/audio/convert")
async def convert_audio(request: ConvertAudioRequest):
    """Convert audio format"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.convert_audio(
            input_file=request.input_file,
            codec=request.codec,
            bitrate=request.bitrate,
            user_id=request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"Convert audio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/batch")
async def create_batch_operation(request: CreateBatchOperationRequest):
    """Create batch processing operation"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.create_batch_operation(
            name=request.name,
            media_type=request.media_type,
            files=request.files,
            operation=request.operation,
            settings=request.settings,
            user_id=request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"Create batch operation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/batch/{batch_id}/start")
async def start_batch_operation(batch_id: str):
    """Start batch operation"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.start_batch_operation(batch_id)
        return result
    except Exception as e:
        logger.error(f"Start batch operation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/media/jobs/{job_id}")
async def get_processing_job(job_id: str):
    """Get processing job details"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.get_job(job_id)
        return result
    except Exception as e:
        logger.error(f"Get processing job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/media/jobs")
async def list_processing_jobs(media_type: Optional[str] = None,
                              status: Optional[str] = None):
    """List processing jobs"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.list_jobs(media_type=media_type, status=status)
        return result
    except Exception as e:
        logger.error(f"List processing jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/media/jobs/{job_id}/cancel")
async def cancel_processing_job(job_id: str):
    """Cancel processing job"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.cancel_job(job_id)
        return result
    except Exception as e:
        logger.error(f"Cancel processing job error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/media/video/profiles")
async def list_video_profiles():
    """List video encoding profiles"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.list_video_profiles()
        return result
    except Exception as e:
        logger.error(f"List video profiles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/media/statistics")
async def get_media_statistics():
    """Get media processing statistics"""
    try:
        from api.media_processing.media_processor import media_processor
        result = media_processor.get_statistics()
        return result
    except Exception as e:
        logger.error(f"Get media statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BUSINESS INTELLIGENCE ENDPOINTS ====================

class CreateDashboardRequest(BaseModel):
    name: str
    description: str
    user_id: str
    widgets: Optional[List[Dict]] = None
    layout: Optional[Dict] = None
    filters: Optional[Dict] = None
    refresh_interval: Optional[int] = 300
    is_public: Optional[bool] = False
    tags: Optional[List[str]] = None


class UpdateDashboardRequest(BaseModel):
    dashboard_id: str
    user_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    widgets: Optional[List[Dict]] = None
    layout: Optional[Dict] = None
    filters: Optional[Dict] = None
    refresh_interval: Optional[int] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None


class CreateKPIRequest(BaseModel):
    name: str
    description: str
    metric: str
    kpi_type: str
    user_id: str
    target_value: Optional[float] = None
    current_value: Optional[float] = 0.0
    previous_value: Optional[float] = None
    unit: Optional[str] = ""
    time_range: Optional[str] = "this_month"


class UpdateKPIRequest(BaseModel):
    kpi_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    time_range: Optional[str] = None


class CreateReportRequest(BaseModel):
    name: str
    description: str
    user_id: str
    template: str
    data_sources: List[str]
    filters: Optional[Dict] = None
    columns: Optional[List[Dict]] = None
    sorting: Optional[Dict] = None
    grouping: Optional[List[str]] = None
    aggregations: Optional[Dict] = None
    charts: Optional[List[Dict]] = None
    schedule: Optional[Dict] = None
    recipients: Optional[List[str]] = None
    format: Optional[str] = "pdf"


class QueryDataRequest(BaseModel):
    name: str
    filters: Dict
    user_id: str
    sql: Optional[str] = None


@APP.post("/api/bi/dashboards")
async def create_dashboard(request: CreateDashboardRequest):
    """Create a new BI dashboard"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.create_dashboard(
            name=request.name,
            description=request.description,
            user_id=request.user_id,
            widgets=request.widgets,
            layout=request.layout,
            filters=request.filters,
            refresh_interval=request.refresh_interval,
            is_public=request.is_public,
            tags=request.tags
        )
        return result
    except Exception as e:
        logger.error(f"Create dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/bi/dashboards/{dashboard_id}")
async def get_dashboard(dashboard_id: str, user_id: str):
    """Get dashboard by ID"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.get_dashboard(dashboard_id, user_id)
        return result
    except Exception as e:
        logger.error(f"Get dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/bi/dashboards")
async def list_dashboards(user_id: str, include_public: bool = True):
    """List all dashboards for a user"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.list_dashboards(user_id, include_public)
        return result
    except Exception as e:
        logger.error(f"List dashboards error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.put("/api/bi/dashboards/{dashboard_id}")
async def update_dashboard(dashboard_id: str, request: UpdateDashboardRequest):
    """Update dashboard configuration"""
    try:
        from api.bi.bi_manager import bi_manager
        updates = {k: v for k, v in request.dict().items()
                  if v is not None and k not in ['dashboard_id', 'user_id']}
        result = bi_manager.update_dashboard(dashboard_id, request.user_id, **updates)
        return result
    except Exception as e:
        logger.error(f"Update dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/bi/dashboards/{dashboard_id}")
async def delete_dashboard(dashboard_id: str, user_id: str):
    """Delete a dashboard"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.delete_dashboard(dashboard_id, user_id)
        return result
    except Exception as e:
        logger.error(f"Delete dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/bi/kpis")
async def create_kpi(request: CreateKPIRequest):
    """Create a new KPI"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.create_kpi(
            name=request.name,
            description=request.description,
            metric=request.metric,
            kpi_type=request.kpi_type,
            user_id=request.user_id,
            target_value=request.target_value,
            current_value=request.current_value,
            previous_value=request.previous_value,
            unit=request.unit,
            time_range=request.time_range
        )
        return result
    except Exception as e:
        logger.error(f"Create KPI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/bi/kpis/{kpi_id}")
async def get_kpi(kpi_id: str):
    """Get KPI by ID"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.get_kpi(kpi_id)
        return result
    except Exception as e:
        logger.error(f"Get KPI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/bi/kpis")
async def list_kpis(user_id: str):
    """List all KPIs for a user"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.list_kpis(user_id)
        return result
    except Exception as e:
        logger.error(f"List KPIs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.put("/api/bi/kpis/{kpi_id}")
async def update_kpi(kpi_id: str, request: UpdateKPIRequest):
    """Update KPI values"""
    try:
        from api.bi.bi_manager import bi_manager
        updates = {k: v for k, v in request.dict().items()
                  if v is not None and k != 'kpi_id'}
        result = bi_manager.update_kpi(kpi_id, **updates)
        return result
    except Exception as e:
        logger.error(f"Update KPI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/bi/reports")
async def create_report(request: CreateReportRequest):
    """Create a custom report"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.create_report(
            name=request.name,
            description=request.description,
            user_id=request.user_id,
            template=request.template,
            data_sources=request.data_sources,
            filters=request.filters,
            columns=request.columns,
            sorting=request.sorting,
            grouping=request.grouping,
            aggregations=request.aggregations,
            charts=request.charts,
            schedule=request.schedule,
            recipients=request.recipients,
            format=request.format
        )
        return result
    except Exception as e:
        logger.error(f"Create report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/bi/reports/{report_id}/generate")
async def generate_report(report_id: str, user_id: str):
    """Generate a report"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.generate_report(report_id, user_id)
        return result
    except Exception as e:
        logger.error(f"Generate report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/bi/query")
async def query_data(request: QueryDataRequest):
    """Execute a data query"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.query_data(
            name=request.name,
            filters=request.filters,
            user_id=request.user_id,
            sql=request.sql
        )
        return result
    except Exception as e:
        logger.error(f"Query data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/bi/metrics/{metric_type}")
async def get_metrics(metric_type: str, time_range: str, user_id: str):
    """Get aggregated metrics"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.get_metrics(metric_type, time_range, user_id)
        return result
    except Exception as e:
        logger.error(f"Get metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/bi/dashboards/{dashboard_id}/export")
async def export_dashboard(dashboard_id: str, format: str, user_id: str):
    """Export dashboard to file"""
    try:
        from api.bi.bi_manager import bi_manager
        result = bi_manager.export_dashboard(dashboard_id, format, user_id)
        return result
    except Exception as e:
        logger.error(f"Export dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== API GATEWAY ENDPOINTS ====================

class RegisterServiceRequest(BaseModel):
    name: str
    description: str
    base_url: str
    version: str
    instances: List[Dict]
    health_check_url: Optional[str] = "/health"
    metadata: Optional[Dict] = None
    health_check_interval: Optional[int] = 30
    session_affinity: Optional[bool] = False


class CreateRouteRequest(BaseModel):
    path: str
    method: str
    service_id: str
    target_path: str
    description: str
    auth_required: Optional[bool] = False
    rate_limit_id: Optional[str] = None
    transform_request: Optional[bool] = False
    transform_response: Optional[bool] = False
    cache_enabled: Optional[bool] = False
    cache_ttl: Optional[int] = 0
    timeout: Optional[int] = 5000
    retry_count: Optional[int] = 3
    enabled: Optional[bool] = True


class CreateRateLimitRequest(BaseModel):
    name: str
    description: str
    max_requests: int
    period: str
    scope: str
    enabled: Optional[bool] = True


class ConfigureLoadBalancerRequest(BaseModel):
    service_id: str
    strategy: str
    health_check_interval: Optional[int] = 30
    session_affinity: Optional[bool] = False


@APP.post("/api/gateway/services")
async def register_service(request: RegisterServiceRequest):
    """Register a new microservice"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.register_service(
            name=request.name,
            description=request.description,
            base_url=request.base_url,
            version=request.version,
            instances=request.instances,
            health_check_url=request.health_check_url,
            metadata=request.metadata or {},
            health_check_interval=request.health_check_interval,
            session_affinity=request.session_affinity
        )
        return result
    except Exception as e:
        logger.error(f"Register service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.delete("/api/gateway/services/{service_id}")
async def deregister_service(service_id: str):
    """Deregister a microservice"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.deregister_service(service_id)
        return result
    except Exception as e:
        logger.error(f"Deregister service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/services/{service_id}")
async def get_service(service_id: str):
    """Get service details"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.get_service(service_id)
        return result
    except Exception as e:
        logger.error(f"Get service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/services")
async def list_services(status: Optional[str] = None):
    """List all registered services"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.list_services(status_filter=status)
        return result
    except Exception as e:
        logger.error(f"List services error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/gateway/routes")
async def create_route(request: CreateRouteRequest):
    """Create a new API route"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.create_route(
            path=request.path,
            method=request.method,
            service_id=request.service_id,
            target_path=request.target_path,
            description=request.description,
            auth_required=request.auth_required,
            rate_limit_id=request.rate_limit_id,
            transform_request=request.transform_request,
            transform_response=request.transform_response,
            cache_enabled=request.cache_enabled,
            cache_ttl=request.cache_ttl,
            timeout=request.timeout,
            retry_count=request.retry_count,
            enabled=request.enabled
        )
        return result
    except Exception as e:
        logger.error(f"Create route error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/routes")
async def list_routes():
    """List all routes"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.list_routes()
        return result
    except Exception as e:
        logger.error(f"List routes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/gateway/rate-limits")
async def create_rate_limit(request: CreateRateLimitRequest):
    """Create a rate limit configuration"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.create_rate_limit(
            name=request.name,
            description=request.description,
            max_requests=request.max_requests,
            period=request.period,
            scope=request.scope,
            enabled=request.enabled
        )
        return result
    except Exception as e:
        logger.error(f"Create rate limit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/rate-limits")
async def list_rate_limits():
    """List all rate limit configurations"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.list_rate_limits()
        return result
    except Exception as e:
        logger.error(f"List rate limits error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/gateway/rate-limits/{limit_id}/check")
async def check_rate_limit(limit_id: str, identifier: str):
    """Check if request is within rate limit"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.check_rate_limit(limit_id, identifier)
        return result
    except Exception as e:
        logger.error(f"Check rate limit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/gateway/load-balancers")
async def configure_load_balancer(request: ConfigureLoadBalancerRequest):
    """Configure load balancer for a service"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.configure_load_balancer(
            service_id=request.service_id,
            strategy=request.strategy,
            health_check_interval=request.health_check_interval,
            session_affinity=request.session_affinity
        )
        return result
    except Exception as e:
        logger.error(f"Configure load balancer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/services/{service_id}/next-instance")
async def get_next_instance(service_id: str):
    """Get next service instance using load balancing"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.get_next_instance(service_id)
        return result
    except Exception as e:
        logger.error(f"Get next instance error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.post("/api/gateway/services/{service_id}/health-check")
async def service_health_check(service_id: str):
    """Perform health check on service"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.health_check(service_id)
        return result
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/documentation")
async def get_api_documentation():
    """Get complete API documentation"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.get_api_documentation()
        return result
    except Exception as e:
        logger.error(f"Get API documentation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@APP.get("/api/gateway/stats")
async def get_gateway_stats():
    """Get gateway statistics"""
    try:
        from api.gateway.gateway_manager import gateway_manager
        result = gateway_manager.get_gateway_stats()
        return result
    except Exception as e:
        logger.error(f"Get gateway stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
