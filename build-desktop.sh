#!/bin/bash

echo "========================================"
echo "Telegram Saver Bot - Build Desktop App"
echo "========================================"
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

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="mac"
    BUILD_CMD="build:mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    BUILD_CMD="build:linux"
else
    echo -e "${RED}Unsupported platform: $OSTYPE${NC}"
    exit 1
fi

echo -e "${GREEN}Platform detected: $PLATFORM${NC}"
echo ""

echo -e "${YELLOW}[1/3] Building Frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}Frontend build: OK${NC}"
cd ..

echo ""
echo -e "${YELLOW}[2/3] Installing Desktop Dependencies...${NC}"
cd desktop
if [ ! -d "node_modules" ]; then
    npm install
fi
echo -e "${GREEN}Dependencies: OK${NC}"

echo ""
echo -e "${YELLOW}[3/3] Building Desktop App for $PLATFORM...${NC}"
npm run $BUILD_CMD
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Desktop build failed!${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}BUILD SUCCESSFUL!${NC}"
echo "========================================"
echo ""
echo "Built files in: desktop/dist/"
echo ""
ls -lh dist/ | grep -E '\.(dmg|AppImage|deb|rpm|tar.gz)$'
echo ""
echo "You can now install/run the application!"
echo "========================================"
