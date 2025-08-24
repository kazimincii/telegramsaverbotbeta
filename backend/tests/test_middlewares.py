import asyncio
import json
import sys
from pathlib import Path
from starlette.requests import Request
import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))
import main as main


async def asgi_request(method, path):
    messages = []
    async def send(message):
        messages.append(message)
    async def receive():
        if not receive.body_sent:
            receive.body_sent = True
            return {'type': 'http.request', 'body': b'', 'more_body': False}
        return {'type': 'http.disconnect'}
    receive.body_sent = False
    scope = {
        'type': 'http',
        'asgi': {'version': '3.0'},
        'method': method,
        'path': path,
        'root_path': '',
        'scheme': 'http',
        'query_string': b'',
        'headers': [],
    }
    await main.APP(scope, receive, send)
    await asyncio.sleep(0)
    return messages


def test_request_logging_and_header(capsys, monkeypatch):
    monkeypatch.setattr(main, "load_cfg", lambda: main.Config(api_id="1", api_hash="h"))
    messages = asyncio.run(asgi_request("GET", "/api/config"))
    headers = dict((k.decode(), v.decode()) for k, v in messages[0]["headers"])
    assert "x-process-time" in headers
    out = capsys.readouterr().out
    assert "GET /api/config completed in" in out


def test_global_exception_handled(capsys):
    req = Request({'type': 'http', 'method': 'GET', 'path': '/', 'headers': []})

    async def failing_call_next(_):
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError):
        asyncio.run(main.timing_middleware(req, failing_call_next))
    out = capsys.readouterr().out
    assert "failed in" in out

    resp = asyncio.run(main.global_exception_handler(req, RuntimeError("boom")))
    assert resp.status_code == 500
    assert json.loads(resp.body) == {"detail": "Internal Server Error"}
    out2 = capsys.readouterr().out
    assert "[error] boom" in out2
