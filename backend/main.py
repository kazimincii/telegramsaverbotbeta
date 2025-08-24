
import asyncio, json, re, os, datetime as dt
from pathlib import Path
from threading import Thread, Event
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from telethon import TelegramClient

APP = FastAPI()
APP.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

async def download_worker(cfg:Config):
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

    total = 0
    async for dialog in client.iter_dialogs():
        if STATE["stop"].is_set(): break
        name = dialog.name or str(dialog.id)
        if cfg.chats and str(dialog.id) not in cfg.chats:
            continue
        if include_re and not include_re.search(name):
            continue
        if exclude_re and exclude_re.search(name):
            continue

        chat_dir = out_base / name.replace("/", "_")
        chat_dir.mkdir(parents=True, exist_ok=True)

        log(f"[*] Sohbet: {name}")
        async for msg in client.iter_messages(dialog, reverse=True):
            if STATE["stop"].is_set(): break
            if min_d and (msg.date.replace(tzinfo=None) < min_d): 
                continue
            if max_d and (msg.date.replace(tzinfo=None) > max_d): 
                continue

            # types filter (sadece foto/video/doc)
            kind = None
            if msg.photo and "photos" in cfg.types:
                kind = "photos"
            elif msg.video and "videos" in cfg.types:
                kind = "videos"
            elif getattr(msg, "document", None) and "documents" in cfg.types:
                kind = "documents"

            if not kind:
                continue

            target_dir = chat_dir / kind / str(msg.date.year)
            target_dir.mkdir(parents=True, exist_ok=True)

            if cfg.dry_run:
                total += 1
                STATE["progress"] = {"chat": name, "downloaded": total, "skipped": 0}
                if total % 50 == 0:
                    log(f"[dry] {name} / {kind} ...")
                await asyncio.sleep(cfg.throttle or 0)
                continue

            try:
                await client.download_media(msg, file=str(target_dir))
                total += 1
                STATE["progress"] = {"chat": name, "downloaded": total, "skipped": 0}
                if total % 10 == 0:
                    log(f"[ok] {name} / {kind}")
                await asyncio.sleep(cfg.throttle or 0)
            except Exception as e:
                log(f"[!] indirme hatasi: {e}")

    await client.disconnect()
    log("[*] Worker bitti.")
    STATE["running"] = False

def run_worker(cfg:Config):
    STATE["stop"].clear()
    STATE["running"] = True
    asyncio.run(download_worker(cfg))

@APP.get("/api/config")
def get_config():
    return load_cfg().dict()

@APP.post("/api/config")
def set_config(payload:dict):
    cfg = load_cfg().dict()
    cfg.update(payload or {})
    save_cfg(Config(**cfg))
    return {"ok": True}

@APP.get("/api/dialogs")
async def list_dialogs():
    cfg = load_cfg()
    client = TelegramClient(cfg.session, int(cfg.api_id or 0), cfg.api_hash or "")
    await client.connect()
    if not await client.is_user_authorized():
        await client.disconnect()
        raise HTTPException(status_code=400, detail="Telegram oturumu yetkili degil. login_once.bat calistirin.")
    items = []
    async for d in client.iter_dialogs():
        if getattr(d, "is_user", False):
            continue
        items.append({"id": str(d.id), "name": d.name or str(d.id)})
    await client.disconnect()
    return {"dialogs": items}

@APP.post("/api/start")
def start():
    if STATE["running"]:
        return {"ok": True, "already": True}
    cfg = load_cfg()
    if not cfg.api_id or not cfg.api_hash:
        raise HTTPException(status_code=400, detail="API ID/HASH zorunlu")
    t = Thread(target=run_worker, args=(cfg,), daemon=True)
    STATE["worker"] = t
    t.start()
    return {"ok": True}

@APP.post("/api/stop")
def stop():
    STATE["stop"].set()
    return {"ok": True}

@APP.get("/api/status")
def status():
    # son ~50 log satiri dondur.
    tail = STATE["log"][-50:]
    return {"running": STATE["running"], "progress": STATE.get("progress"), "logTail": tail}
