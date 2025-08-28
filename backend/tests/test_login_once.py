import asyncio
import logging
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
os.environ.setdefault("API_ID", "1")
os.environ.setdefault("API_HASH", "h")
from backend import login_once


class FailingQR:
    def __init__(self, fail_once=True):
        self.url = "u"
        self._fail_once = fail_once

    async def wait(self):
        if self._fail_once:
            self._fail_once = False
            raise RuntimeError("boom")
        return


class FakeClient:
    def __init__(self):
        self.qr_calls = 0
        self.authorized = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        pass

    async def is_user_authorized(self):
        return self.authorized

    async def qr_login(self):
        self.qr_calls += 1
        if self.qr_calls == 1:
            return FailingQR()
        self.authorized = True
        return FailingQR(fail_once=False)

    async def get_me(self):
        return SimpleNamespace(username=None, first_name="me")


def test_qr_login_retries_and_logs(monkeypatch, caplog):
    client = FakeClient()
    monkeypatch.setattr(login_once, "TelegramClient", lambda *a, **k: client)
    monkeypatch.setattr(login_once, "save_qr_png", lambda *a, **k: None)
    caplog.set_level(logging.WARNING)
    asyncio.run(login_once.main())
    assert client.qr_calls == 2
    assert any("qr.wait failed" in r.message and "boom" in r.message for r in caplog.records)


def test_save_qr_png_logs_errors(monkeypatch, caplog):
    class DummyQrcode:
        @staticmethod
        def make(url):
            raise RuntimeError("fail")

    monkeypatch.setitem(sys.modules, "qrcode", DummyQrcode)
    caplog.set_level(logging.ERROR)
    login_once.save_qr_png("url")
    assert any("Failed to save QR PNG" in r.message and "fail" in r.message for r in caplog.records)
