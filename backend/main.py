
import asyncio, json, re, os, datetime as dt, time
from pathlib import Path
from threading import Event
from fastapi import FastAPI, Header, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from telethon import TelegramClient, types

APP = FastAPI()
APP.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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
    min_date: str = ""
    max_date: str = ""
    throttle: float = 0.2
    concurrency: int = 3
    dry_run: bool = False

STATE = {
    "running": False,
    "log": [],
    "progress": None,
    "stop": Event(),
    "worker": None,
    "config": None
}

def load_cfg()->Config:
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

def save_cfg(cfg:Config):
    CFG_FILE.write_text(cfg.json(indent=2), encoding="utf-8")
    STATE["config"] = cfg

def log(msg:str):
    print(msg, flush=True)
    buf = STATE["log"]
    buf.append(msg)
    del buf[:-500]

async def download_file(client: TelegramClient, msg, target_dir: Path, part_size_kb: int = 512):
    """Download ``msg`` media to ``target_dir`` with resume support."""
    fname = getattr(getattr(msg, "file", None), "name", f"{msg.id}")
    dest = target_dir / fname
    part = dest.with_suffix(dest.suffix + ".part")
    offset = part.stat().st_size if part.exists() else 0
    mode = "ab" if offset else "wb"
    try:
        with open(part, mode) as f:
            await client.download_file(msg.media, f, offset=offset, part_size_kb=part_size_kb)
    except Exception:
        # keep partial file for later resume
        raise
    part.rename(dest)
    return dest

async def download_worker(cfg: Config, channels: Optional[List[str]] = None, media_types: Optional[List[str]] = None):
    log("[*] Worker basladi.")
    client = TelegramClient(cfg.session, int(cfg.api_id or 0), cfg.api_hash or "")
    await client.connect()
    if not await client.is_user_authorized():
        log("[!] Telegram oturumu yetkili degil. login_once.bat calistirin.")
        STATE["running"] = False
        await client.disconnect()
        return

    out_base = Path(cfg.out or "C:/TelegramArchive")
    out_base.mkdir(parents=True, exist_ok=True)

    min_d = dt.datetime.fromisoformat(cfg.min_date) if cfg.min_date else None
    max_d = dt.datetime.fromisoformat(cfg.max_date) if cfg.max_date else None

    include_re = re.compile("|".join(cfg.include), re.I) if cfg.include else None
    exclude_re = re.compile("|".join(cfg.exclude), re.I) if cfg.exclude else None

    channel_filter = set(channels or [])
    media_types = media_types or cfg.types
    filter_map = {
        "photos": (types.InputMessagesFilterPhotos, "photos"),
        "videos": (types.InputMessagesFilterVideo, "videos"),
        "documents": (types.InputMessagesFilterDocument, "documents"),
    }
    filters = [(filter_map[t][0](), filter_map[t][1]) for t in media_types if t in filter_map] or [(None, None)]

    sem = asyncio.Semaphore(cfg.concurrency)
    progress_lock = asyncio.Lock()
    total = 0

    async def handle_message(msg, name, kind, target_dir):
        nonlocal total
        async with sem:
            if cfg.dry_run:
                async with progress_lock:
                    total += 1
                    STATE["progress"] = {"chat": name, "downloaded": total, "skipped": 0}
                    if total % 50 == 0:
                        log(f"[dry] {name} / {kind} ...")
                await asyncio.sleep(cfg.throttle or 0)
                return

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
        username = getattr(dialog, "entity", None)
        username = getattr(username, "username", None)
        if channel_filter and name not in channel_filter and str(dialog.id) not in channel_filter and username not in channel_filter:
            continue
        if include_re and not include_re.search(name):
            continue
        if exclude_re and exclude_re.search(name):
            continue

        chat_dir = out_base / name.replace("/", "_")
        chat_dir.mkdir(parents=True, exist_ok=True)

        log(f"[*] Sohbet: {name}")
        tasks = []
        for flt, fkind in filters:
            async for msg in client.iter_messages(dialog, reverse=True, filter=flt):
                if STATE["stop"].is_set():
                    break
                if min_d and (msg.date.replace(tzinfo=None) < min_d):
                    continue
                if max_d and (msg.date.replace(tzinfo=None) > max_d):
                    continue

                kind = fkind
                if not kind:
                    if msg.photo and "photos" in media_types:
                        kind = "photos"
                    elif msg.video and "videos" in media_types:
                        kind = "videos"
                    elif getattr(msg, "document", None) and "documents" in media_types:
                        kind = "documents"
                    else:
                        continue

                target_dir = chat_dir / kind / str(msg.date.year)
                target_dir.mkdir(parents=True, exist_ok=True)

                tasks.append(asyncio.create_task(handle_message(msg, name, kind, target_dir)))

        if tasks:
            await asyncio.gather(*tasks)

    await client.disconnect()
    log("[*] Worker bitti.")
    STATE["running"] = False


async def run_worker(cfg: Config, channels=None, media_types=None):
    STATE["stop"].clear()
    STATE["running"] = True
    await download_worker(cfg, channels, media_types)


def launch_worker(cfg: Config, channels=None, media_types=None):
    task = asyncio.create_task(run_worker(cfg, channels, media_types))
    STATE["worker"] = task

@APP.get("/api/config")
def get_config():
    return load_cfg().dict()

@APP.post("/api/config")
def set_config(payload:dict):
    cfg = load_cfg().dict()
    cfg.update(payload or {})
    save_cfg(Config(**cfg))
    return {"ok": True}

@APP.post("/api/start")
async def start(background_tasks: BackgroundTasks, payload: Optional[dict] = None):
    if STATE["running"]:
        return {"ok": True, "already": True}
    cfg = load_cfg()
    if not cfg.api_id or not cfg.api_hash:
        raise HTTPException(status_code=400, detail="API ID/HASH zorunlu")
    channels = (payload or {}).get("channels")
    media_types = (payload or {}).get("media_types")
    background_tasks.add_task(launch_worker, cfg, channels, media_types)
    return {"ok": True}


def request_stop():
    STATE["stop"].set()


@APP.post("/api/stop")
async def stop(background_tasks: BackgroundTasks):
    background_tasks.add_task(request_stop)
    return {"ok": True}

@APP.get("/api/status")
def status():
    # son ~50 log satiri döndür.
    tail = STATE["log"][-50:]
    return {"running": STATE["running"], "progress": STATE.get("progress"), "logTail": tail}
