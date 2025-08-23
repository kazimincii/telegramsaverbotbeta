
import sys, os, json, shutil, subprocess, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CFG = ROOT / "config.json"
VENV = ROOT / ".venv"
SESSION = ROOT / "tg_media.session"

def ok(msg): print("[OK] " + msg)
def bad(msg): print("[!!] " + msg)

print("=== Doctor ===")
print("Python:", sys.version)
print("Root:", ROOT)

# Config check
if not CFG.exists():
    bad("config.json yok. UI'dan bir kez Kaydet'e basin.")
else:
    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    if not cfg.get("api_id") or not cfg.get("api_hash"):
        bad("API_ID/API_HASH bos.")
    else:
        ok("API_ID/API_HASH gorundu.")
    out = cfg.get("out") or ""
    if out:
        p = Path(out); p.mkdir(parents=True, exist_ok=True)
        ok(f"Out klasoru hazir: {p}")
    else:
        bad("Out klasoru bos.")

# Venv check
if not VENV.exists():
    bad("Sanal ortam bulunamadi. Bir kez start_all.bat calistir.")
else:
    ok("Sanal ortam var.")
    pip = VENV / "Scripts" / "pip.exe"
    if pip.exists():
        print("\n[+] Paketler:")
        try:
            subprocess.run([str(pip), "freeze"], check=False)
        except Exception as e:
            print("pip freeze hatasi:", e)

if SESSION.exists():
    ok("Telegram session bulundu.")
else:
    bad("Telegram session yok. login_once.bat ile giris yapin.")
