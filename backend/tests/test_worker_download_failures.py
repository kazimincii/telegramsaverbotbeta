import asyncio
import datetime as dt
from types import SimpleNamespace

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main


class FailingClient:
    async def connect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def disconnect(self):
        pass

    async def iter_dialogs(self):
        yield SimpleNamespace(name="chat", id=1)

    async def iter_messages(self, dialog, reverse=True, filter=None):
        yield SimpleNamespace(id=1, date=dt.datetime.now(), photo=True)


def test_worker_logs_download_failures(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: FailingClient())

    calls = 0

    async def failing_download(client, msg, target_dir):
        nonlocal calls
        calls += 1
        raise RuntimeError("boom")

    monkeypatch.setattr(main, "download_file", failing_download)
    main.STATE["log"] = []

    cfg = main.Config(api_id="1", api_hash="h", types=["photos"], out=str(tmp_path))
    asyncio.run(main.download_worker(cfg))

    assert calls == 3
    assert any("[error] download failed for chat: boom" in entry for entry in main.STATE["log"])
