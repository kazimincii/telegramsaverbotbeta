import asyncio
import datetime as dt
from types import SimpleNamespace
from pathlib import Path
import sys
import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main


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
        from telethon import types
        if dialog.name == "chan1" and isinstance(filter, types.InputMessagesFilterPhotos):
            yield SimpleNamespace(id=10, date=now, photo=True, file=SimpleNamespace(name="p.jpg"), media="loc")
        if dialog.name == "chan1" and isinstance(filter, types.InputMessagesFilterVideo):
            yield SimpleNamespace(id=11, date=now, video=True, file=SimpleNamespace(name="v.mp4"), media="loc")

    async def download_file(self, *a, **k):
        pass


class ResumeClient:
    def __init__(self):
        self.data = b"x" * 2048

    async def download_file(self, location, file, offset=0, part_size_kb=512):
        if offset == 0:
            file.write(self.data[:1024])
            raise Exception("fail")
        else:
            file.write(self.data[offset:])


def test_channel_and_media_filters(monkeypatch, tmp_path):
    fake = FilterClient()
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: fake)
    calls = []

    async def fake_download_file(client, msg, target_dir):
        calls.append((msg.id, target_dir))

    monkeypatch.setattr(main, "download_file", fake_download_file)
    cfg = main.Config(api_id="1", api_hash="h", out=str(tmp_path))
    asyncio.run(main.download_worker(cfg, channels=["chan1"], media_types=["photos", "videos"]))
    assert fake.iter_calls == [("chan1", "InputMessagesFilterPhotos"), ("chan1", "InputMessagesFilterVideo")]
    assert len(calls) == 2


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
