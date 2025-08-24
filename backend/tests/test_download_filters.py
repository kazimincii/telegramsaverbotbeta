import asyncio
import datetime as dt
from pathlib import Path
from types import SimpleNamespace
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main
from backend.main import Config
from telethon import types as tl_types


class FilterClient:
    def __init__(self):
        self.iter_calls = []

    async def connect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def disconnect(self):
        pass

    async def iter_dialogs(self):
        yield SimpleNamespace(name="chan1", id=1, entity=SimpleNamespace(username="chan1"))
        yield SimpleNamespace(name="chan2", id=2, entity=SimpleNamespace(username="chan2"))

    async def iter_messages(self, dialog, reverse=True, filter=None):
        self.iter_calls.append((dialog.name, type(filter).__name__ if filter else None))
        now = dt.datetime.now()
        if dialog.name == "chan1" and isinstance(filter, tl_types.InputMessagesFilterPhotoVideo):
            yield SimpleNamespace(id=10, date=now, photo=True, file=SimpleNamespace(name="p.jpg"), media="loc")
            yield SimpleNamespace(id=11, date=now, video=True, file=SimpleNamespace(name="v.mp4"), media="loc")


def test_chat_and_media_filters(monkeypatch, tmp_path):
    fake = FilterClient()
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: fake)
    calls = []

    async def fake_download_file(client, msg, target_dir):
        calls.append((msg.id, target_dir))

    monkeypatch.setattr(main, "download_file", fake_download_file)
    cfg = Config(api_id="1", api_hash="h", out=str(tmp_path))
    asyncio.run(main.download_worker(cfg, chats=["chan1"], media_types=["photos", "videos"]))
    assert fake.iter_calls == [("chan1", "InputMessagesFilterPhotoVideo")]
    assert sorted(m[0] for m in calls) == [10, 11]


class ResumeClient:
    def __init__(self):
        self.data = b"x" * 2048

    async def download_file(self, location, file, offset=0, part_size_kb=512):
        if offset == 0:
            file.write(self.data[:1024])
            raise Exception("fail")
        else:
            file.write(self.data[offset:])


def test_download_resume(tmp_path):
    client = ResumeClient()
    msg = SimpleNamespace(id=1, date=dt.datetime.now(), file=SimpleNamespace(name="big.bin"), media="loc")
    with pytest.raises(Exception):
        asyncio.run(main.download_file(client, msg, tmp_path))
    part = tmp_path / "big.bin.part"
    assert part.exists() and part.stat().st_size == 1024
    asyncio.run(main.download_file(client, msg, tmp_path))
    full = tmp_path / "big.bin"
    assert full.exists() and full.stat().st_size == 2048


class DummyClient:
    def __init__(self, messages):
        self.messages = messages
        self.iter_messages_filter = None

    async def connect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def disconnect(self):
        pass

    async def iter_dialogs(self):
        yield SimpleNamespace(id=1, name="chan1")

    async def iter_messages(self, dialog, reverse=True, filter=None):
        self.iter_messages_filter = filter
        for m in self.messages:
            yield m

    async def download_file(self, media, file, offset=0):
        file.write(b"data")


async def _dummy_sleep(*args, **kwargs):
    return None


def test_photo_filter(monkeypatch, tmp_path):
    msg = SimpleNamespace(
        id=1,
        date=dt.datetime(2024, 1, 1),
        photo=True,
        video=None,
        document=None,
        file=SimpleNamespace(size=10, name="a.jpg"),
    )
    client = DummyClient([msg])
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: client)
    monkeypatch.setattr(main.asyncio, "sleep", _dummy_sleep)
    cfg = Config(api_id="1", api_hash="2", out=str(tmp_path), types=["photos"])
    asyncio.run(main.download_worker(cfg, chats=[1], media_types=["photos"]))
    assert isinstance(client.iter_messages_filter, tl_types.InputMessagesFilterPhotos)
