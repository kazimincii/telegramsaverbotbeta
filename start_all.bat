@echo off
where cmd >nul 2>nul || ( echo cmd.exe bulunamadi. Lutfen README.md'deki sorun giderme bolumune bakin. & pause & exit /b 1 )
title Administrator: start_all
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

echo [+] Backend ortam hazirlaniyor...
if not exist backend\.venv (
  echo     - Python sanal ortami olusturuluyor...
  py -3 -m venv backend\.venv 2>nul || python -m venv backend\.venv
)
call backend\.venv\Scripts\python -m pip install --upgrade pip
call backend\.venv\Scripts\pip install -r backend\requirements.txt

echo [+] Backend baslatiliyor...
start "backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [+] Frontend hazirlaniyor...
if exist frontend\package.json (
  pushd frontend
  call npm install
  popd
  echo [+] Frontend baslatiliyor...
  start "frontend" cmd /k "cd /d %~dp0frontend && set REACT_APP_API_BASE=http://127.0.0.1:8000 && npm start"
) else (
  echo [!] frontend\package.json bulunamadi. Frontend klasoru eksik olabilir.
)

echo [*] Tarayici: http://localhost:3000
exit /b
