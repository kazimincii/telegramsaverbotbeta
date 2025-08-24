import asyncio
import datetime as dt
import json
import re
from pathlib import Path
from threading import Event
from typing import List, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from telethon import TelegramClient, types

APP = FastAPI()
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


class Config(BaseModel):
    api_id: str
    api_hash: str
    session: str = "tg_media"
    out: str = "C:/TelegramArchive"
    types: List[str] = ["photos"]
    include: List[str] = []
    exclude: List[str] = []
    chats: List[str] = []
    min_date: str = ""
    max_date: str = ""
    throttle: float = 0.2
    concurrency: int = 3
    dry_run: bool = False
    channels: List[int] = []


ROOT = Path(__file__).resolve().parent
CFG_FILE = ROOT / "config.json"

STATE = {
    "running": False,
    "log": [],
    "progress": None,
    "stop": Event(),
    "worker": None,
    "config": None,
}


def log(msg: str) -> None:
    print(msg, flush=True)
    buf = STATE["log"]
    buf.append(msg)
    del buf[:-500]


def load_cfg() -> Config:
    if CFG_FILE.exists():
        try:
            cfg = Config(**json.loads(CFG_FILE.read_text("utf-8")))
        except Exception:
            cfg = Config(api_id="", api_hash="")
    else:
        cfg = Config(api_id="", api_hash="")
        CFG_FILE.write_text(cfg.json(indent=2), encoding="utf-8")
    STATE["config"] = cfg
    return cfg


def save_cfg(cfg: Config) -> None:
    CFG_FILE.write_text(cfg.json(indent=2), encoding="utf-8")
    STATE["config"] = cfg


@APP.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = asyncio.get_running_loop().time()
    try:
        response = await call_next(request)
    except Exception:
        duration = asyncio.get_running_loop().time() - start
        log(f"{request.method} {request.url.path} failed in {duration:.4f}s")
        raise
    duration = asyncio.get_running_loop().time() - start
    log(f"{request.method} {request.url.path} completed in {duration:.4f}s")
    response.headers["X-Process-Time"] = f"{duration:.4f}"
    return response


@APP.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log(f"[error] {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@APP.get("/api/config")
def get_config():
    return load_cfg().dict()


async def download_file(client: TelegramClient, msg, target_dir: Path, part_size_kb: int = 512) -> Path:
    fname = getattr(getattr(msg, "file", None), "name", f"{msg.id}")
    dest = target_dir / fname
    part = dest.with_suffix(dest.suffix + ".part")
    offset = part.stat().st_size if part.exists() else 0
    mode = "ab" if offset else "wb"
    try:
        with open(part, mode) as f:
            await client.download_file(msg.media, f, offset=offset, part_size_kb=part_size_kb)
    except Exception:
        raise
    part.rename(dest)
    return dest


def _make_filters(media_types: List[str]):
    fmap = {
        "photos": (types.InputMessagesFilterPhotos(), "photos"),
        "videos": (types.InputMessagesFilterVideo(), "videos"),
        "documents": (types.InputMessagesFilterDocument(), "documents"),
    }
    return [fmap[t] for t in media_types if t in fmap] or [(None, None)]


async def download_worker(cfg: Config, channels: Optional[List[str]] = None, media_types: Optional[List[str]] = None):
    log("[*] Worker basladi.")
    client = TelegramClient(cfg.session, int(cfg.api_id or 0), cfg.api_hash or "")
    try:
        await client.connect()
        if not await client.is_user_authorized():
            log("[!] Telegram oturumu yetkili degil. login_once.bat calistirin.")
            return

        out_base = Path(cfg.out or "C:/TelegramArchive")
        out_base.mkdir(parents=True, exist_ok=True)

        min_d = dt.datetime.fromisoformat(cfg.min_date) if cfg.min_date else None
        max_d = dt.datetime.fromisoformat(cfg.max_date) if cfg.max_date else None
        include_re = re.compile("|".join(cfg.include), re.I) if cfg.include else None
        exclude_re = re.compile("|".join(cfg.exclude), re.I) if cfg.exclude else None

        channel_filter = {str(c) for c in (channels or cfg.channels or [])}
        allowed_types = media_types or cfg.types
        filters = _make_filters(allowed_types)

        sem = asyncio.Semaphore(cfg.concurrency)
        progress_lock = asyncio.Lock()
        total = 0

        async def handle_message(msg, name, kind, target_dir):
            nonlocal total
            async with sem:
                for attempt in range(3):
                    try:
                        await download_file(client, msg, target_dir)
                        async with progress_lock:
                            total += 1
                            STATE["progress"] = {"chat": name, "downloaded": total, "skipped": 0}
                            if total % 10 == 0:
                                log(f"[ok] {name} / {kind}")
                        await asyncio.sleep(cfg.throttle or 0)
                        break
                    except Exception as e:
                        if attempt == 2:
                            log(f"[!] indirme hatasi: {e}")
                        await asyncio.sleep(2 ** attempt)

        async for dialog in client.iter_dialogs():
            if STATE["stop"].is_set():
                break
            name = dialog.name or str(dialog.id)
            username = getattr(getattr(dialog, "entity", None), "username", None)
            if channel_filter and name not in channel_filter and str(dialog.id) not in channel_filter and username not in channel_filter:
                continue
            if include_re and not include_re.search(name):
                continue
            if exclude_re and exclude_re.search(name):
                continue

            chat_dir = out_base / name.replace("/", "_")
            chat_dir.mkdir(parents=True, exist_ok=True)

            tasks = []
            for flt, fkind in filters:
                async for msg in client.iter_messages(dialog, reverse=True, filter=flt):
                    if STATE["stop"].is_set():
                        break
                    if min_d and msg.date.replace(tzinfo=None) < min_d:
                        continue
                    if max_d and msg.date.replace(tzinfo=None) > max_d:
                        continue

                    kind = fkind
                    if not kind:
                        if msg.photo and "photos" in allowed_types:
                            kind = "photos"
                        elif msg.video and "videos" in allowed_types:
                            kind = "videos"
                        elif getattr(msg, "document", None) and "documents" in allowed_types:
                            kind = "documents"
                        else:
                            continue

                    target_dir = chat_dir / kind / str(msg.date.year)
                    target_dir.mkdir(parents=True, exist_ok=True)
                    tasks.append(asyncio.create_task(handle_message(msg, name, kind, target_dir)))

            if tasks:
                await asyncio.gather(*tasks)

        log("[*] Worker bitti.")
    finally:
        await client.disconnect()
        STATE["running"] = False

def run_worker_sync(cfg: Config, channels: Optional[List[str]] = None, media_types: Optional[List[str]] = None):
    STATE["stop"].clear()
    STATE["running"] = True
    asyncio.run(download_worker(cfg, channels, media_types))


@APP.post("/api/start")
def start(background_tasks: BackgroundTasks, payload: Optional[dict] = None):
    if STATE["running"]:
        return {"ok": True, "already": True}
    cfg = load_cfg()
    if not cfg.api_id or not cfg.api_hash:
        raise HTTPException(status_code=400, detail="API ID/HASH zorunlu")
    channels = (payload or {}).get("channels")
    media_types = (payload or {}).get("media_types")
    background_tasks.add_task(run_worker_sync, cfg, channels, media_types)
    return {"ok": True}


def request_stop():
    STATE["stop"].set()


@APP.post("/api/stop")
async def stop(background_tasks: BackgroundTasks):
    background_tasks.add_task(request_stop)
    return {"ok": True}


@APP.get("/api/status")
def status():
    tail = STATE["log"][-50:]
    return {"running": STATE["running"], "progress": STATE.get("progress"), "logTail": tail}
