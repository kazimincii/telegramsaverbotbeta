@echo off
title Administrator: menu
setlocal
cd /d "%~dp0"

:menu
echo.
echo 1 - login_once    : Telegram oturumunu baslatir
echo 2 - login-qr      : QR kod ile oturum acar
echo 3 - start_all     : Backend ve frontend'i baslatir
echo 4 - stop_all      : Calisan servisleri durdurur
echo 5 - run-all       : Ortami kurar ve tum projeyi calistirir
echo 6 - doctor        : Sistemi kontrol eder ve sorunlari giderir
echo 0 - Cikis

set /p choice="Seciminiz: "
if "%choice%"=="1" call login_once.bat
if "%choice%"=="2" call login-qr.bat
if "%choice%"=="3" call start_all.bat
if "%choice%"=="4" call stop_all.bat
if "%choice%"=="5" call run-all.bat
if "%choice%"=="6" call doctor.bat
if "%choice%"=="0" exit /b

echo Gecersiz secim.
pause
goto menu
