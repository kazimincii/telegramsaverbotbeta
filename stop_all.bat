@echo off
where cmd >nul 2>nul || ( echo cmd.exe bulunamadi. Lutfen README.md'deki sorun giderme bolumune bakin. & pause & exit /b 1 )
title Administrator: stop_all
REM Deneysel: uvicorn/react calisan pencereleri kapatmaya calisir.
for /f "tokens=2 delims==;" %%i in ('wmic process where "CommandLine like '%%uvicorn main:app%%'" get ProcessId /value ^| find "="') do taskkill /PID %%i /F >nul 2>&1
for /f "tokens=2 delims==;" %%i in ('wmic process where "CommandLine like '%%react-scripts start%%'" get ProcessId /value ^| find "="') do taskkill /PID %%i /F >nul 2>&1
echo Kapatildi (varsa). Acik pencere kalirsa manuel kapatin.
pause
