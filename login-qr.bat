@echo off
where cmd >nul 2>nul || ( echo cmd.exe bulunamadi. Lutfen README.md'deki sorun giderme bolumune bakin. & pause & exit /b 1 )
setlocal
cd /d "%~dp0"
if exist .venv\Scripts\python.exe (
  ".venv\Scripts\python.exe" backend\login_once_qr.py
) else (
  py -3 backend\login_once_qr.py
)
pause
