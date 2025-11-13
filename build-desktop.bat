@echo off
echo ========================================
echo Telegram Saver Bot - Build for Windows
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Building Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
echo Frontend build: OK
cd ..

echo.
echo [2/3] Installing Desktop Dependencies...
cd desktop
if not exist "node_modules" (
    call npm install
)
echo Dependencies: OK

echo.
echo [3/3] Building Desktop App for Windows...
call npm run build:win
if %errorlevel% neq 0 (
    echo ERROR: Desktop build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Installer created in: desktop\dist\
echo.
dir /B dist\*.exe
echo.
echo You can now run the installer!
echo ========================================
pause
