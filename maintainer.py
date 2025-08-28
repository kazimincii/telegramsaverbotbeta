#!/usr/bin/env python3
"""Repository maintenance helper.

Usage:
    python maintainer.py check  # run tests and static checks
    python maintainer.py fix    # apply auto-formatters
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def run(cmd, cwd=None):
    print(f"\n$ {' '.join(cmd)}")
    try:
        subprocess.run(cmd, cwd=cwd, check=True)
    except FileNotFoundError:
        print(f"Komut bulunamadı: {cmd[0]}")
    except subprocess.CalledProcessError as e:
        print(f"Komut hata kodu {e.returncode} ile bitti")


def check():
    # backend tests and lint
    run([sys.executable, "-m", "pytest"], cwd=ROOT / "backend")
    run(["flake8", "backend", "tests"], cwd=ROOT)

    # frontend tests and lint
    run(["npm", "test", "--", "--watchAll=false"], cwd=ROOT / "frontend")
    run(["npx", "eslint", "src"], cwd=ROOT / "frontend")


def fix():
    # auto-format python
    run(["black", "backend", "tests"], cwd=ROOT)

    # auto-fix frontend
    run(["npx", "eslint", "src", "--fix"], cwd=ROOT / "frontend")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"check", "fix"}:
        print(__doc__)
        sys.exit(1)

    if sys.argv[1] == "check":
        check()
    else:
        fix()
