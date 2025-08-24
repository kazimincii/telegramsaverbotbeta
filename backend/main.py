import asyncio
import json
import time
from pathlib import Path
from threading import Event
from typing import List, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from telethon import TelegramClient, types as tl_types

APP = FastAPI()
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # Track current chat name, number of downloaded files and skipped messages
    "progress": {"chat": "", "downloaded": 0, "skipped": 0},
    "stop": Event(),
    "worker": None,
    "config": None,
}


def log(msg: str) -> None:
    print(msg, flush=True)
    buf = STATE["log"]
    buf.append(msg)
    del buf[:-500]


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


def load_cfg() -> Config:
    if CFG_FILE.exists():
        try:
            data = json.loads(CFG_FILE.read_text("utf-8"))
        except Exception:
            data = {}
    else:
        data = {}
    cfg = Config(**data)
    STATE["config"] = cfg
    return cfg


def save_cfg(cfg: Config) -> None:
    CFG_FILE.write_text(cfg.json(indent=2), encoding="utf-8")
    STATE["config"] = cfg


@APP.get("/api/config")
def get_config():
    return load_cfg().dict()


@APP.post("/api/config")
def set_config(payload: dict):
    cfg = Config(**payload)
    save_cfg(cfg)
    return {"ok": True}


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


async def download_file(client: TelegramClient, msg, target_dir: Path) -> Path:
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
    return final


async def download_worker(
    cfg: Config,
    channels: Optional[List[str]] = None,
    media_types: Optional[List[str]] = None,
):
    client = TelegramClient(cfg.session, int(cfg.api_id or 0), cfg.api_hash or "")
    await client.connect()
    if not await client.is_user_authorized():
        raise PermissionError("Telegram oturumu yetkili değil")

    media_types = media_types or cfg.types
    out_base = Path(cfg.out or "C:/TelegramArchive")
    out_base.mkdir(parents=True, exist_ok=True)
    # reset progress counters for a new run
    STATE["progress"] = {"chat": "", "downloaded": 0, "skipped": 0}
    sem = asyncio.Semaphore(cfg.concurrency)
    chosen = set(channels or cfg.channels or [])
    flt = make_media_filter(media_types)

    tasks = []

    async for dialog in client.iter_dialogs():
        name = (
            getattr(dialog, "name", None)
            or getattr(getattr(dialog, "entity", None), "username", None)
            or str(getattr(dialog, "id", ""))
        )
        if chosen and (name not in chosen and getattr(dialog, "id", None) not in chosen):
            continue
        # record current chat being processed
        STATE["progress"]["chat"] = name
        chat_dir = out_base / name
        async for msg in client.iter_messages(dialog, reverse=True, filter=flt):
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

            async def runner(m=msg, dname=name, tdir=target_dir):
                async with sem:
                    for attempt in range(3):
                        try:
                            await download_file(client, m, tdir)
                            STATE["progress"]["downloaded"] += 1
                            break
                        except Exception:
                            if attempt == 2:
                                break
                            await asyncio.sleep(cfg.throttle)

            tasks.append(asyncio.create_task(runner()))

    if tasks:
        await asyncio.gather(*tasks)
    await client.disconnect()
    log("[*] Worker bitti.")


def run_worker_sync(
    cfg: Config, channels: Optional[List[str]] = None, media_types: Optional[List[str]] = None
):
    STATE["stop"].clear()
    STATE["running"] = True
    try:
        asyncio.run(download_worker(cfg, channels=channels, media_types=media_types))
    finally:
        STATE["running"] = False


async def run_worker_async(cfg: Config, channels=None, media_types=None):
    STATE["stop"].clear()
    STATE["running"] = True
    try:
        await download_worker(cfg, channels=channels, media_types=media_types)
    finally:
        STATE["running"] = False


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
