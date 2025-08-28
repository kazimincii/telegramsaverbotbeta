import asyncio
import logging
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend import contacts


class FailingPhotoClient:
    async def connect(self):
        pass

    async def download_profile_photo(self, *args, **kwargs):
        raise RuntimeError("boom")

    async def disconnect(self):
        pass


def test_export_vcf_logs_photo_warning(monkeypatch, caplog):
    caplog.set_level(logging.WARNING)
    monkeypatch.setattr(contacts, "TelegramClient", lambda *a, **k: FailingPhotoClient())

    cfg = {"api_id": "1", "api_hash": "h"}
    payload = {"include_photo": True}
    items = [{"id": 1, "full_name": "Alice"}]

    vcf, skipped = asyncio.run(contacts.export_vcf(cfg, payload, items))

    assert skipped == [1]
    assert any(
        "photo download failed" in r.message and "boom" in r.message
        for r in caplog.records
    )
