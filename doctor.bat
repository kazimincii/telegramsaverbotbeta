@echo off
where cmd >nul 2>nul || ( echo cmd.exe bulunamadi. Lutfen README.md'deki sorun giderme bolumune bakin. & pause & exit /b 1 )
title Administrator: doctor
cd /d "%~dp0backend"
start "doctor" cmd /k ".venv\Scripts\python doctor.py"
