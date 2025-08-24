import asyncio
import datetime as dt
from types import SimpleNamespace

import backend.main as main
from backend.main import Config
from telethon import types as tl_types

class DummyClient:
    def __init__(self, messages):
        self.messages = messages
        self.iter_messages_filter = None
        self.download_file_calls = []

    async def connect(self):
        pass

    async def disconnect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def iter_dialogs(self):
        yield SimpleNamespace(id=1, name="chan1")

    async def iter_messages(self, dialog, reverse=True, filter=None):
        self.iter_messages_filter = filter
        for m in self.messages:
            yield m

    async def download_media(self, msg, file=None):
        pass

    async def download_file(self, media, file, offset=0):
        self.download_file_calls.append(offset)
        file.write(b"data")

async def _dummy_sleep(*args, **kwargs):
    return None


def test_photo_filter(monkeypatch, tmp_path):
    msg = SimpleNamespace(id=1, date=dt.datetime(2024,1,1), photo=True, video=None, document=None,
                          file=SimpleNamespace(size=10, name="a.jpg"))
    client = DummyClient([msg])
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: client)
    monkeypatch.setattr(main.asyncio, "sleep", _dummy_sleep)
    cfg = Config(api_id="1", api_hash="2", out=str(tmp_path), types=["photos"])
    asyncio.run(main.download_worker(cfg, channels=[1], media_types=["photos"]))
    assert isinstance(client.iter_messages_filter, tl_types.InputMessagesFilterPhotos)


def test_photo_video_filter(monkeypatch, tmp_path):
    msg = SimpleNamespace(id=1, date=dt.datetime(2024,1,1), photo=True, video=None, document=None,
                          file=SimpleNamespace(size=10, name="a.jpg"))
    client = DummyClient([msg])
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: client)
    monkeypatch.setattr(main.asyncio, "sleep", _dummy_sleep)
    cfg = Config(api_id="1", api_hash="2", out=str(tmp_path), types=["photos","videos"])
    asyncio.run(main.download_worker(cfg, channels=[1], media_types=["photos","videos"]))
    assert isinstance(client.iter_messages_filter, tl_types.InputMessagesFilterPhotoVideo)


def test_document_filter(monkeypatch, tmp_path):
    msg = SimpleNamespace(id=1, date=dt.datetime(2024,1,1), photo=None, video=None,
                          document=SimpleNamespace(size=10, attributes=[SimpleNamespace(file_name="a.pdf")]),
                          file=SimpleNamespace(size=10, name="a.pdf"))
    client = DummyClient([msg])
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: client)
    monkeypatch.setattr(main.asyncio, "sleep", _dummy_sleep)
    cfg = Config(api_id="1", api_hash="2", out=str(tmp_path), types=["documents"])
    asyncio.run(main.download_worker(cfg, channels=[1], media_types=["documents"]))
    assert isinstance(client.iter_messages_filter, tl_types.InputMessagesFilterDocument)


def test_large_file_resume(monkeypatch, tmp_path):
    big = 3 * 1024 ** 3
    msg = SimpleNamespace(
        id=2,
        date=dt.datetime(2024,1,1),
        photo=None,
        video=None,
        document=SimpleNamespace(size=big, attributes=[SimpleNamespace(file_name="big.bin")]),
        file=SimpleNamespace(size=big, name="big.bin"),
    )
    client = DummyClient([msg])
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: client)
    monkeypatch.setattr(main.asyncio, "sleep", _dummy_sleep)
    cfg = Config(api_id="1", api_hash="2", out=str(tmp_path), types=["documents"], channels=[1])
    part_dir = tmp_path / "chan1" / "documents" / "2024"
    part_dir.mkdir(parents=True)
    (part_dir / "big.bin.part").write_bytes(b"12345")
    asyncio.run(main.download_worker(cfg, channels=[1], media_types=["documents"]))
    assert client.download_file_calls == [5]
    assert (part_dir / "big.bin").exists()
