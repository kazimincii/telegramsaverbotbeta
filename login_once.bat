@echo off
title Administrator: login_once
setlocal
cd /d "%~dp0"
if not exist backend\.venv (
  py -3 -m venv backend\.venv 2>nul || python -m venv backend\.venv
)
call backend\.venv\Scripts\python -m pip install --upgrade pip
call backend\.venv\Scripts\pip install -r backend\requirements.txt
start "login_once" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && python login_once.py"
