import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import main

async def fake_list_contacts(cfg, payload):
    return {"items": [{"id": 1, "full_name": "Alice"}]}

def test_contacts_endpoint(monkeypatch):
    monkeypatch.setattr(main, "load_cfg", lambda: main.Config(api_id="1", api_hash="h"))
    monkeypatch.setattr(main.contacts, "list_contacts", fake_list_contacts)
    data = asyncio.run(main.list_contacts())
    assert data == [{"id": 1, "full_name": "Alice"}]
