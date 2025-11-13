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
    tail = STATE["log"][-50:]
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
