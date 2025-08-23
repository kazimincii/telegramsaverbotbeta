@echo off
setlocal
cd /d "%~dp0"
if exist .venv\Scripts\python.exe (
  ".venv\Scripts\python.exe" backend\login_once_qr.py
) else (
  py -3 backend\login_once_qr.py
)
pause
