import asyncio
import json
import re
import datetime as dt
import time
from pathlib import Path
from threading import Event
from typing import List, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
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


@APP.get("/api/config")
async def get_config():
    return load_cfg()


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
    media = (
        getattr(msg, "document", None)
        or getattr(msg, "photo", None)
        or getattr(msg, "video", None)
        or getattr(msg, "media", None)
    )
    try:
        with open(temp, "ab") as f:
            await client.download_file(media, file=f, offset=offset)
    except Exception:
        raise
    temp.replace(final)
    return final


async def download_worker(
    cfg: Config,
    channels: Optional[List[str]] = None,
    media_types: Optional[List[str]] = None,
):
    log("[*] Worker basladi.")
    client = TelegramClient(cfg.session, int(cfg.api_id or 0), cfg.api_hash or "")
    await client.connect()
    if not await client.is_user_authorized():
        log("[!] Telegram oturumu yetkili degil. login_once.bat calistirin.")
        await client.disconnect()
        return

    media_types = media_types or cfg.types
    out_base = Path(cfg.out or "C:/TelegramArchive")
    out_base.mkdir(parents=True, exist_ok=True)
    STATE["progress"] = {"total": 0, "downloaded": 0}
    sem = asyncio.Semaphore(cfg.concurrency)

    async def handle_message(dialog_name, mtype, msg):
        target_dir = out_base / dialog_name / mtype / str(msg.date.year)
        for attempt in range(3):
            try:
                await download_file(client, msg, target_dir)
                STATE["progress"]["downloaded"] += 1
                break
            except Exception:
                if attempt == 2:
                    break
                await asyncio.sleep(cfg.throttle)

    tasks = []
    chosen = set(channels or cfg.channels or [])
    filt = make_media_filter(media_types)

    async for dialog in client.iter_dialogs():
        name = (
            getattr(dialog, "name", None)
            or getattr(getattr(dialog, "entity", None), "username", None)
            or str(getattr(dialog, "id", ""))
        )
        if chosen and (name not in chosen and getattr(dialog, "id", None) not in chosen):
            continue
        async for msg in client.iter_messages(dialog, reverse=True, filter=filt):
            if getattr(msg, "photo", None):
                mtype = "photos"
            elif getattr(msg, "video", None):
                mtype = "videos"
            elif getattr(msg, "document", None):
                mtype = "documents"
            else:
                continue
            STATE["progress"]["total"] += 1
            async def run(msg=msg, mtype=mtype, dname=name):
                async with sem:
                    await handle_message(dname, mtype, msg)
            tasks.append(asyncio.create_task(run()))

    await asyncio.gather(*tasks)
    await client.disconnect()
    log("[*] Worker bitti.")

