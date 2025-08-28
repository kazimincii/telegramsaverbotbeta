@echo off
setlocal
cd /d %~dp0
where cmd >nul 2>nul || ( echo cmd.exe bulunamadi. Lutfen README.md'deki sorun giderme bolumune bakin. & pause & exit /b 1 )
if not exist logs mkdir logs
where python >nul 2>nul || ( echo Python bulunamadi. Lutfen Python 3.10+ kurun. & pause & exit /b 1 )
if not exist .venv ( python -m venv .venv )
call .\.venv\Scripts\activate.bat
python -m pip install --upgrade pip
if exist backend\requirements.txt ( python -m pip install -r backend\requirements.txt ) else ( python -m pip install fastapi uvicorn[standard] telethon qrcode[pil] python-dotenv )
python -m backend.doctor --fix > logs\doctor.log
start "backend" cmd /k "call .\.venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info"
if exist frontend\package.json (
  cd frontend
  if not exist node_modules ( npm install )
  set REACT_APP_API_BASE=http://127.0.0.1:8000
  start "frontend" cmd /k "set REACT_APP_API_BASE=http://127.0.0.1:8000 && npm start"
  cd ..
)
start "" http://127.0.0.1:8000/docs
start "" http://localhost:3000
