
import asyncio, json, re, os, datetime as dt, time
from pathlib import Path
from threading import Event
from fastapi import FastAPI, Header, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from telethon import TelegramClient, types as tl_types

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
    channels: List[int] = []

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

def make_media_filter(types: Optional[List[str]]):
    tset = set(types or [])
    if tset == {"photos"}:
        return tl_types.InputMessagesFilterPhotos()
    if tset == {"videos"}:
        return tl_types.InputMessagesFilterVideo()
    if tset == {"documents"}:
        return tl_types.InputMessagesFilterDocument()
    if tset == {"photos", "videos"}:
        return tl_types.InputMessagesFilterPhotoVideo()
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
    media = msg.document or msg.photo or msg.video or msg.media
    with open(temp, "ab") as f:
        await client.download_file(media, file=f, offset=offset)
    temp.replace(final)
    return final

async def download_worker(cfg:Config, channels: Optional[List[int]] = None, media_types: Optional[List[str]] = None):
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

 codex/add-filters-to-download_worker-function
    channels_set = set(channels or cfg.channels or [])
    allowed_types = media_types or cfg.types
    msg_filter = make_media_filter(allowed_types)


    sem = asyncio.Semaphore(cfg.concurrency)
    progress_lock = asyncio.Lock()
 main
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
                    await client.download_media(msg, file=str(target_dir))
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
 codex/add-filters-to-download_worker-function
        if channels_set and dialog.id not in channels_set:
            continue

 main
        if include_re and not include_re.search(name):
            continue
        if exclude_re and exclude_re.search(name):
            continue

        chat_dir = out_base / name.replace("/", "_")
        chat_dir.mkdir(parents=True, exist_ok=True)

        log(f"[*] Sohbet: {name}")
 codex/add-filters-to-download_worker-function
        async for msg in client.iter_messages(dialog, reverse=True, filter=msg_filter):

        tasks = []
        async for msg in client.iter_messages(dialog, reverse=True):
 main
            if STATE["stop"].is_set():
                break
            if min_d and (msg.date.replace(tzinfo=None) < min_d):
                continue
            if max_d and (msg.date.replace(tzinfo=None) > max_d):
                continue

 codex/add-filters-to-download_worker-function

            # types filter (sadece photos/videos/documents)
 main
            kind = None
            if msg.photo and "photos" in allowed_types:
                kind = "photos"
            elif msg.video and "videos" in allowed_types:
                kind = "videos"
            elif getattr(msg, "document", None) and "documents" in allowed_types:
                kind = "documents"

            if not kind:
                continue

            target_dir = chat_dir / kind / str(msg.date.year)
            target_dir.mkdir(parents=True, exist_ok=True)

            tasks.append(asyncio.create_task(handle_message(msg, name, kind, target_dir)))

 codex/add-filters-to-download_worker-function
            try:
                size = getattr(getattr(msg, "file", None), "size", 0) or getattr(getattr(msg, "document", None), "size", 0)
                if size and size > 2 * 1024 * 1024 * 1024:
                    await download_file(client, msg, target_dir)
                else:
                    await client.download_media(msg, file=str(target_dir))
                total += 1
                STATE["progress"] = {"chat": name, "downloaded": total, "skipped": 0}
                if total % 10 == 0:
                    log(f"[ok] {name} / {kind}")
                await asyncio.sleep(cfg.throttle or 0)
            except Exception as e:
                log(f"[!] indirme hatasi: {e}")

        if tasks:
            await asyncio.gather(*tasks)
 main

    await client.disconnect()
    log("[*] Worker bitti.")
    STATE["running"] = False

 codex/add-filters-to-download_worker-function
def run_worker(cfg:Config, channels: Optional[List[int]] = None, media_types: Optional[List[str]] = None):
    STATE["stop"].clear()
    STATE["running"] = True
    asyncio.run(download_worker(cfg, channels=channels, media_types=media_types))


async def run_worker(cfg: Config):
    STATE["stop"].clear()
    STATE["running"] = True
    await download_worker(cfg)


def launch_worker(cfg: Config):
    task = asyncio.create_task(run_worker(cfg))
    STATE["worker"] = task
 main

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
 codex/add-filters-to-download_worker-function
def start(payload: dict):

async def start(background_tasks: BackgroundTasks):
 main
    if STATE["running"]:
        return {"ok": True, "already": True}
    cfg = load_cfg()
    if not cfg.api_id or not cfg.api_hash:
        raise HTTPException(status_code=400, detail="API ID/HASH zorunlu")
 codex/add-filters-to-download_worker-function
    channels = payload.get("channels") if isinstance(payload, dict) else None
    media_types = payload.get("media_types") if isinstance(payload, dict) else None
    t = Thread(target=run_worker, args=(cfg, channels, media_types), daemon=True)
    STATE["worker"] = t
    t.start()

    background_tasks.add_task(launch_worker, cfg)
 main
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
