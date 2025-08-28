import asyncio
import logging
import sys
from pathlib import Path
from types import SimpleNamespace
import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.contacts import collect_chats_and_users, infer_notes


class FailingParticipantClient:
    async def get_dialogs(self):
        chat = SimpleNamespace(name="chat", is_group=True, is_channel=False, entity=SimpleNamespace())
        return [chat]

    async def get_entity(self, entity):
        return entity

    async def __call__(self, request):
        raise RuntimeError("boom")

    async def get_participants(self, entity):
        return [SimpleNamespace(id=1)]


class FailingIterClient:
    async def iter_messages(self, *args, **kwargs):
        raise RuntimeError("fail")
        yield None  # make this an async generator


def test_collect_chats_and_users_logs_error(caplog):
    caplog.set_level(logging.WARNING)
    client = FailingParticipantClient()
    chats, users = asyncio.run(collect_chats_and_users(client, None))
    assert 1 in users
    assert any("GetParticipantsRequest failed" in r.message and "boom" in r.message for r in caplog.records)


def test_infer_notes_logs_error(caplog):
    caplog.set_level(logging.WARNING)
    client = FailingIterClient()
    notes = asyncio.run(infer_notes(client, [SimpleNamespace()], 1, ["k"]))
    assert notes == {}
    assert any("iter_messages failed" in r.message and "fail" in r.message for r in caplog.records)
