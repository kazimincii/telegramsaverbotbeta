import asyncio
import datetime as dt
from types import SimpleNamespace

import pytest

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main


class FakeClient:
    def __init__(self, n):
        self.n = n
        self.active = 0
        self.max_active = 0
        self.calls = {i: 0 for i in range(n)}

    async def connect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def disconnect(self):
        pass

    async def iter_dialogs(self):
        yield SimpleNamespace(name="chat", id=1)

    async def iter_messages(self, dialog, reverse=True, filter=None):
        for i in range(self.n):
            yield SimpleNamespace(id=i, date=dt.datetime.now(), photo=True)


def test_worker_limits_concurrency_and_retries(monkeypatch, tmp_path):
    fake = FakeClient(5)
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: fake)
    async def fake_download_file(client, msg, target_dir):
        fake.calls[msg.id] += 1
        fake.active += 1
        fake.max_active = max(fake.max_active, fake.active)
        await asyncio.sleep(0.05)
        fake.active -= 1
        if fake.calls[msg.id] == 1:
            raise Exception("fail")

    monkeypatch.setattr(main, "download_file", fake_download_file)
    cfg = main.Config(api_id="1", api_hash="h", concurrency=2, types=["photos"], out=str(tmp_path))
    asyncio.run(main.download_worker(cfg))
    assert fake.max_active <= cfg.concurrency
    assert all(c == 2 for c in fake.calls.values())
    assert main.STATE["progress"]["downloaded"] == 5
