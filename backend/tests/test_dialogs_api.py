import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace
import base64

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
        yield SimpleNamespace(id=1, name="chat1", is_group=True)

    async def get_messages(self, *args, **kwargs):
        class R:
            def __init__(self, total):
                self.total = total

        flt = kwargs.get("filter")
        if isinstance(flt, main.tl_types.InputMessagesFilterPhotos):
            return R(1)
        if isinstance(flt, main.tl_types.InputMessagesFilterVideo):
            return R(2)
        if isinstance(flt, main.tl_types.InputMessagesFilterDocument):
            return R(3)
        return R(0)

    async def download_profile_photo(self, *args, **kwargs):
        return b"img"


def test_dialogs_endpoint(monkeypatch):
    monkeypatch.setattr(main, "TelegramClient", lambda *a, **k: DialogClient())
    monkeypatch.setattr(main, "load_cfg", lambda: main.Config(api_id="1", api_hash="h"))
    data = asyncio.run(main.list_dialogs())
    expected_photo = "data:image/jpeg;base64," + base64.b64encode(b"img").decode()
    assert data == [
        {
            "id": 1,
            "name": "chat1",
            "username": None,
            "photo": expected_photo,
            "counts": {"photos": 1, "videos": 2, "documents": 3},
        }
    ]
