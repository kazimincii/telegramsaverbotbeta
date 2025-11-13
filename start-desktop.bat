@echo off
echo ====================================
echo Telegram Saver Bot - Desktop App
echo ====================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if Python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    where py >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python is not installed!
        echo Please install Python from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

echo [1/5] Checking installations...
echo   - Node.js: OK
echo   - Python: OK
echo.

:: Install dependencies if needed
if not exist "desktop\node_modules" (
    echo [2/5] Installing desktop dependencies...
    cd desktop
    call npm install
    cd ..
) else (
    echo [2/5] Desktop dependencies: OK
)

if not exist "frontend\node_modules" (
    echo [3/5] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo [3/5] Frontend dependencies: OK
)

echo [4/5] Checking Python dependencies...
python -c "import fastapi" 2>nul
if %errorlevel% neq 0 (
    echo Installing Python dependencies...
    cd backend
    python -m pip install -r requirements.txt
    cd ..
) else (
    echo Python dependencies: OK
)

echo.
echo [5/5] Starting application...
echo.
echo ====================================
echo Starting Backend...
echo ====================================

:: Start backend in background
start /B cmd /c "cd backend && python main.py > backend.log 2>&1"
timeout /t 3 /nobreak >nul

echo.
echo ====================================
echo Starting Frontend...
echo ====================================

:: Start frontend in background
start /B cmd /c "cd frontend && npm start > frontend.log 2>&1"
timeout /t 5 /nobreak >nul

echo.
echo ====================================
echo Starting Desktop App...
echo ====================================

:: Start desktop app
cd desktop
npm start

:: Cleanup on exit
echo.
echo Shutting down...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
