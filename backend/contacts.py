from __future__ import annotations
import re, base64
from typing import List, Dict, Set
import logging
from telethon import TelegramClient
from telethon.tl.functions.channels import GetParticipantsRequest
from telethon.tl.types import ChannelParticipantsSearch

async def collect_chats_and_users(client: TelegramClient, filter_pat: str | None):
    dialogs = await client.get_dialogs()
    pat = re.compile(filter_pat) if filter_pat else None
    chats = []
    for d in dialogs:
        name = (getattr(d, "name", None) or getattr(d, "title", None) or "").strip()
        is_groupish = bool(getattr(d, "is_group", False) or getattr(d, "is_channel", False))
        if not is_groupish: continue
        if pat and not pat.search(name or ""): continue
        chats.append(d)
    users = {}
    for d in chats:
        entity = await client.get_entity(d.entity)
        try:
            for ch in ["a","e","i","o","u","s","m","k","t"]:
                parts = await client(
                    GetParticipantsRequest(
                        entity, ChannelParticipantsSearch(ch), 0, 200, hash=0
                    )
                )
                for u in parts.users:
                    users[u.id] = u
        except Exception as exc:
            logging.getLogger(__name__).warning(
                "GetParticipantsRequest failed: %s", exc
            )
            for u in await client.get_participants(entity):
                users[u.id] = u
    return chats, users

async def infer_notes(client: TelegramClient, chats, scan: int, keywords: List[str]):
    notes: Dict[int, Set[str]] = {}
    if scan <= 0 or not keywords: return notes
    kws = [k.lower() for k in keywords]
    for d in chats:
        try:
            async for m in client.iter_messages(d, limit=scan):
                txt = (m.message or "").lower()
                if not txt:
                    continue
                uid = getattr(m, "sender_id", None)
                if not uid:
                    continue
                hit = [kw for kw in kws if kw in txt]
                if hit:
                    prev = notes.get(uid, set())
                    prev.update(hit)
                    notes[uid] = prev
        except Exception as exc:
            logging.getLogger(__name__).warning(
                "iter_messages failed: %s", exc
            )
    return notes

def vc_escape(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

async def list_contacts(cfg: dict, payload: dict) -> dict:
    api_id = int(cfg["api_id"]); api_hash = cfg["api_hash"]; session = cfg.get("session") or "tg_media"
    filter_pat = payload.get("filter") or None
    scan = int(payload.get("scan", 0))
    do_note = bool(payload.get("note", False))
    keywords = payload.get("keywords") or cfg.get("contact_keywords") or []

    client = TelegramClient(session, api_id, api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        raise PermissionError("Telegram oturumu yetkili değil")

    chats, users = await collect_chats_and_users(client, filter_pat)
    notes = await infer_notes(client, chats, scan, keywords) if do_note else {}

    items = []
    for uid, u in users.items():
        first = (getattr(u,'first_name', '') or '').strip()
        last = (getattr(u,'last_name', '') or '').strip()
        nick = (getattr(u,'username', '') or '').strip()
        phone = (getattr(u,'phone','') or '').strip()
        full = (first + (' '+last if last else '')).strip() or (nick and f"@{nick}") or str(uid)
        note = ", ".join(sorted(notes.get(uid, []))) if uid in notes else ''
        items.append({
            "id": int(uid), "full_name": full, "first": first, "last": last,
            "username": nick, "phone": phone, "note": note,
        })
    await client.disconnect()
    return {"items": items}

async def export_vcf(cfg: dict, payload: dict, items: list[dict] | None = None) -> str:
    api_id = int(cfg["api_id"]); api_hash = cfg["api_hash"]; session = cfg.get("session") or "tg_media"
    only_ids = set(map(int, payload.get("only_ids") or []))
    override_notes = payload.get("override_notes") or {}
    include_photo = bool(payload.get("include_photo", False))
    if items is None:
        listed = await list_contacts(cfg, payload)
        items = listed.get("items", [])

    client = None
    if include_photo:
        client = TelegramClient(session, api_id, api_hash)
        await client.connect()

    lines: list[str] = []
    for it in items:
        if only_ids and int(it["id"]) not in only_ids: continue
        first = it.get("first",""); last = it.get("last",""); full = it.get("full_name","")
        nick = it.get("username",""); phone = it.get("phone","")
        note  = override_notes.get(str(it["id"])) or override_notes.get(int(it["id"])) or it.get("note","")
        lines.append("BEGIN:VCARD"); lines.append("VERSION:3.0")
        lines.append(f"N:{vc_escape(last)};{vc_escape(first)};;;")
        lines.append(f"FN:{vc_escape(full)}")
        if nick: lines.append(f"NICKNAME:{vc_escape(nick)}")
        if phone: lines.append(f"TEL;TYPE=CELL:{phone}")
        if include_photo and client is not None:
            try:
                raw = await client.download_profile_photo(int(it["id"]), file=bytes)
                if raw:
                    b64 = base64.b64encode(raw).decode("ascii")
                    lines.append(f"PHOTO;ENCODING=b;TYPE=JPEG:{b64}")
            except Exception: pass
        if note: lines.append(f"NOTE:{vc_escape(str(note))}")
        lines.append("END:VCARD")

    if client is not None: await client.disconnect()
    return "\n".join(lines) + "\n"
