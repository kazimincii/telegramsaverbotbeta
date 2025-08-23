@echo off
title Administrator: doctor
cd /d "%~dp0backend"
start "doctor" cmd /k ".venv\Scripts\python doctor.py"
