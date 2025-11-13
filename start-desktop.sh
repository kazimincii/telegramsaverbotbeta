#!/bin/bash

echo "===================================="
echo "Telegram Saver Bot - Desktop App"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed!${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}ERROR: Python is not installed!${NC}"
    echo "Please install Python from: https://www.python.org/downloads/"
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo -e "${GREEN}[1/5] Checking installations...${NC}"
echo "  - Node.js: OK ($(node --version))"
echo "  - Python: OK ($($PYTHON_CMD --version))"
echo ""

# Install dependencies if needed
if [ ! -d "desktop/node_modules" ]; then
    echo -e "${YELLOW}[2/5] Installing desktop dependencies...${NC}"
    cd desktop
    npm install
    cd ..
else
    echo -e "${GREEN}[2/5] Desktop dependencies: OK${NC}"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[3/5] Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
else
    echo -e "${GREEN}[3/5] Frontend dependencies: OK${NC}"
fi

echo -e "${GREEN}[4/5] Checking Python dependencies...${NC}"
$PYTHON_CMD -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing Python dependencies..."
    cd backend
    $PYTHON_CMD -m pip install -r requirements.txt
    cd ..
else
    echo "Python dependencies: OK"
fi

echo ""
echo -e "${GREEN}[5/5] Starting application...${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    pkill -f "python.*main.py"
    pkill -f "node.*react-scripts"
    pkill -f "electron"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

echo "===================================="
echo "Starting Backend..."
echo "===================================="

# Start backend in background
cd backend
$PYTHON_CMD main.py > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

echo ""
echo "===================================="
echo "Starting Frontend..."
echo "===================================="

# Start frontend in background
cd frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

echo ""
echo "===================================="
echo "Starting Desktop App..."
echo "===================================="

# Start desktop app (foreground)
cd desktop
npm start

# Cleanup on exit
cleanup
