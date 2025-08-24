import asyncio
import datetime as dt
import json
import re
import time
from pathlib import Path
from threading import Event
from typing import List, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from telethon import TelegramClient, types


APP = FastAPI()
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@APP.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration = time.perf_counter() - start
        log(f"{request.method} {request.url.path} failed in {duration:.4f}s")
        raise
    duration = time.perf_counter() - start
    log(f"{request.method} {request.url.path} completed in {duration:.4f}s")
    response.headers["X-Process-Time"] = f"{duration:.4f}"
    return response


@APP.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log(f"[error] {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


ROOT = Path(__file__).resolve().parent
CFG_FILE = ROOT / "config.json"


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


STATE = {
    "running": False,
    "log": [],
    "progress": None,
    "stop": Event(),
    "worker": None,
    "config": None,
}


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


def save_cfg(cfg: Config):
    CFG_FILE.write_text(cfg.json(indent=2), encoding="utf-8")
    STATE["config"] = cfg


def log(msg: str):
    print(msg, flush=True)
    buf = STATE["log"]
    buf.append(msg)
    del buf[:-500]


def make_media_filter(types_list: Optional[List[str]]):
    tset = set(types_list or [])
    if tset == {"photos"}:
        return types.InputMessagesFilterPhotos()
    if tset == {"videos"}:
        return types.InputMessagesFilterVideo()
    if tset == {"documents"}:
        return types.InputMessagesFilterDocument()
    if tset == {"photos", "videos"}:
        return types.InputMessagesFilterPhotoVideo()
    return None


async def download_file(client: TelegramClient, msg, target_dir: Path):
    filename = getattr(getattr(msg, "file", None), "name", None)
    if not filename and getattr(msg, "document", None):
        for attr in getattr(msg.document, "attributes", []):
            if getattr(attr, "file_name", None):
                filename = attr.file_name
                break
    filename = filename or f"{msg.id}"
    target_dir.mkdir(parents=True, exist_ok=True)
    final = target_dir / filename
    temp = final.with_suffix(final.suffix + ".part")
    offset = temp.stat().st_size if temp.exists() else 0
    media = (
        getattr(msg, "document", None)
        or getattr(msg, "photo", None)
        or getattr(msg, "video", None)
        or getattr(msg, "media", None)
    )
    with open(temp, "ab") as f:
        await client.download_file(media, file=f, offset=offset)
    temp.replace(final)
    return final


async def download_worker(
    cfg: Config,
    channels: Optional[List[str]] = None,
    media_types: Optional[List[str]] = None,
):
    STATE["stop"].clear()
    STATE["running"] = True
    STATE["progress"] = {"chat": "", "downloaded": 0, "skipped": 0}
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
        media_types = media_types or cfg.types
        msg_filter = make_media_filter(media_types)

        sem = asyncio.Semaphore(cfg.concurrency)
        progress_lock = asyncio.Lock()
        total = 0

        async def handle_message(msg, name, kind, target_dir):
            nonlocal total
            async with sem:
                if cfg.dry_run:
                    async with progress_lock:
                        total += 1
                        STATE["progress"] = {
                            "chat": name,
                            "downloaded": total,
                            "skipped": 0,
                        }
                    await asyncio.sleep(cfg.throttle or 0)
                    return
                for attempt in range(3):
                    try:
                        await download_file(client, msg, target_dir)
                        async with progress_lock:
                            total += 1
                            STATE["progress"] = {
                                "chat": name,
                                "downloaded": total,
                                "skipped": 0,
                            }
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
            username = getattr(getattr(dialog, "entity", None), "username", None) or ""
            if (
                channel_filter
                and str(dialog.id) not in channel_filter
                and name not in channel_filter
                and username not in channel_filter
            ):
                continue
            if include_re and not include_re.search(name):
                continue
            if exclude_re and exclude_re.search(name):
                continue

            chat_dir = out_base / name.replace("/", "_")
            chat_dir.mkdir(parents=True, exist_ok=True)

            tasks = []
            async for msg in client.iter_messages(dialog, reverse=True, filter=msg_filter):
                if STATE["stop"].is_set():
                    break
                if min_d and (msg.date.replace(tzinfo=None) < min_d):
                    continue
                if max_d and (msg.date.replace(tzinfo=None) > max_d):
                    continue

                kind = None
                if getattr(msg, "photo", None) and "photos" in media_types:
                    kind = "photos"
                elif getattr(msg, "video", None) and "videos" in media_types:
                    kind = "videos"
                elif getattr(msg, "document", None) and "documents" in media_types:
                    kind = "documents"
                if not kind:
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


def run_worker(cfg: Config, channels: Optional[List[str]] = None, media_types: Optional[List[str]] = None):
    STATE["stop"].clear()
    STATE["running"] = True
    asyncio.run(download_worker(cfg, channels=channels, media_types=media_types))


async def run_worker_async(cfg: Config, channels=None, media_types=None):
    STATE["stop"].clear()
    STATE["running"] = True
    await download_worker(cfg, channels, media_types)


def launch_worker(cfg: Config, channels=None, media_types=None):
    task = asyncio.create_task(run_worker_async(cfg, channels, media_types))
    STATE["worker"] = task


@APP.get("/api/config")
def get_config():
    cfg = load_cfg()
    return cfg.dict()
