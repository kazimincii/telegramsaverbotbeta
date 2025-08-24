import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main


class DialogClient:
    async def connect(self):
        pass

    async def is_user_authorized(self):
        return True

    async def disconnect(self):
        pass

    async def iter_dialogs(self):
        yield SimpleNamespace(id=1, name="chat1")
        yield SimpleNamespace(id=2, name="chat2")


def test_dialogs_endpoint(monkeypatch):
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: DialogClient())
    monkeypatch.setattr(main, "load_cfg", lambda: main.Config(api_id="1", api_hash="h"))
    data = asyncio.run(main.list_dialogs())
    assert data == [{"id": 1, "name": "chat1"}, {"id": 2, "name": "chat2"}]
