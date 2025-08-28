import asyncio
import datetime as dt
from types import SimpleNamespace

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main


class FakeClient:
    async def connect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def disconnect(self):
        pass

    async def iter_dialogs(self):
        yield SimpleNamespace(name="chat1", id=1)
        yield SimpleNamespace(name="chat2", id=2)

    async def iter_messages(self, dialog, reverse=True, filter=None):
        yield SimpleNamespace(id=f"{dialog.id}-0", date=dt.datetime.now(), photo=True)


def test_worker_processes_multiple_dialogs(monkeypatch, tmp_path, capsys):
    fake = FakeClient()
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: fake)

    calls = []

    async def fake_download_file(client, msg, target_dir):
        calls.append(msg.id)
        await asyncio.sleep(0)

    monkeypatch.setattr(main, "download_file", fake_download_file)
    cfg = main.Config(api_id="1", api_hash="h", types=["photos"], out=str(tmp_path))
    asyncio.run(main.download_worker(cfg))
    err = capsys.readouterr().err
    assert "Task was destroyed but it is pending" not in err
    assert calls == ["1-0", "2-0"]
    assert main.STATE["progress"]["downloaded"] == 2
    assert main.STATE["progress"]["skipped"] == 0
