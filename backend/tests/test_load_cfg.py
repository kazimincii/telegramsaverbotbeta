import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))
import main as main


def test_load_cfg_malformed_json(tmp_path, capsys, monkeypatch):
    bad_cfg = tmp_path / "config.json"
    bad_cfg.write_text("{ invalid json }", encoding="utf-8")
    monkeypatch.setattr(main, "CFG_FILE", bad_cfg)
    with pytest.raises(main.HTTPException):
        main.load_cfg()
    out = capsys.readouterr().out
    assert "failed to load config" in out
