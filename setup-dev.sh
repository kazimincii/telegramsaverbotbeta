#!/bin/bash

# Development Setup Script
# Sets up the development environment with all dependencies

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Telegram Saver - Development Setup"
echo "=========================================="
echo ""

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} $NPM_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    exit 1
fi

# Check Python
echo -n "Checking Python... "
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

if command -v $PYTHON_CMD &> /dev/null; then
    PYTHON_VERSION=$($PYTHON_CMD --version)
    echo -e "${GREEN}✓${NC} $PYTHON_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "Please install Python 3.11+ from https://python.org/"
    exit 1
fi

# Check pip
echo -n "Checking pip... "
if command -v pip3 &> /dev/null || command -v pip &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not installed${NC}"
    exit 1
fi

echo ""
echo "All prerequisites met!"
echo ""

# Install backend dependencies
echo "=========================================="
echo "  Installing Backend Dependencies"
echo "=========================================="
cd backend
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt || pip install -r requirements.txt
    echo -e "${GREEN}✓${NC} Backend dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} requirements.txt not found"
fi
cd ..
echo ""

# Install frontend dependencies
echo "=========================================="
echo "  Installing Frontend Dependencies"
echo "=========================================="
cd frontend
npm install
echo -e "${GREEN}✓${NC} Frontend dependencies installed"
cd ..
echo ""

# Install desktop dependencies
echo "=========================================="
echo "  Installing Desktop Dependencies"
echo "=========================================="
cd desktop
npm install
echo -e "${GREEN}✓${NC} Desktop dependencies installed"
cd ..
echo ""

# Create .env files if they don't exist
echo "=========================================="
echo "  Creating Environment Files"
echo "=========================================="
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓${NC} Created backend/.env from template"
        echo -e "${YELLOW}⚠${NC} Please edit backend/.env with your values"
    fi
fi

if [ ! -f "desktop/.env" ]; then
    if [ -f "desktop/.env.example" ]; then
        cp desktop/.env.example desktop/.env
        echo -e "${GREEN}✓${NC} Created desktop/.env from template"
    fi
fi
echo ""

# Build frontend
echo "=========================================="
echo "  Building Frontend"
echo "=========================================="
cd frontend
npm run build
echo -e "${GREEN}✓${NC} Frontend built successfully"
cd ..
echo ""

echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your Telegram API credentials"
echo "  2. Run: ./start-desktop.sh (or .bat on Windows)"
echo ""
echo "For development:"
echo "  Backend:  cd backend && python3 main.py"
echo "  Frontend: cd frontend && npm start"
echo "  Desktop:  cd desktop && npm start"
echo ""
