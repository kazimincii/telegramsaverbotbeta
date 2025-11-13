#!/bin/bash

# Telegram Saver Bot - Production Build Script
# Cross-platform production build automation

set -e  # Exit on error

echo "=========================================="
echo "  Telegram Saver Bot - Production Build"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# Check if we're in the right directory
if [ ! -f "desktop/package.json" ]; then
    print_error "Must be run from project root directory"
    exit 1
fi

# Step 1: Check prerequisites
print_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm: $NPM_VERSION"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python3 not found. Please install Python 3.8+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
print_success "Python: $PYTHON_VERSION"

echo ""

# Step 2: Clean previous builds
print_info "Cleaning previous builds..."
rm -rf frontend/build
rm -rf desktop/dist
print_success "Cleaned build directories"

echo ""

# Step 3: Install/Update dependencies
print_info "Installing dependencies..."

# Backend dependencies
cd backend
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
print_success "Backend dependencies installed"
cd ..

# Frontend dependencies
cd frontend
npm install --quiet
print_success "Frontend dependencies installed"
cd ..

# Desktop dependencies
cd desktop
npm install --quiet
print_success "Desktop dependencies installed"
cd ..

echo ""

# Step 4: Build Frontend
print_info "Building frontend..."
cd frontend
npm run build
FRONTEND_SIZE=$(du -sh build | cut -f1)
print_success "Frontend built successfully ($FRONTEND_SIZE)"
cd ..

echo ""

# Step 5: Build Desktop App
print_info "Building desktop application..."
cd desktop

# Detect platform
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    print_info "Platform: Linux"
    npm run build:linux
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="mac"
    print_info "Platform: macOS"
    npm run build:mac
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
    print_info "Platform: Windows"
    npm run build:win
else
    print_error "Unknown platform: $OSTYPE"
    exit 1
fi

cd ..

echo ""

# Step 6: Summary
print_info "Build completed!"
echo ""
echo "=========================================="
echo "  Build Summary"
echo "=========================================="
echo ""

# List build artifacts
if [ -d "desktop/dist" ]; then
    echo "📦 Build artifacts in desktop/dist/:"
    ls -lh desktop/dist/ | grep -v "^total" | awk '{print "   - " $9 " (" $5 ")"}'
    echo ""
    
    TOTAL_SIZE=$(du -sh desktop/dist | cut -f1)
    echo "📊 Total size: $TOTAL_SIZE"
else
    print_warning "No build artifacts found"
fi

echo ""
echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo ""
echo "1. Test the application:"
if [[ "$PLATFORM" == "linux" ]]; then
    echo "   ./desktop/dist/Telegram-Saver-*.AppImage"
elif [[ "$PLATFORM" == "mac" ]]; then
    echo "   Open desktop/dist/Telegram-Saver-*.dmg"
elif [[ "$PLATFORM" == "windows" ]]; then
    echo "   Run desktop/dist/Telegram-Saver-*.exe"
fi
echo ""
echo "2. Configure Telegram API credentials:"
echo "   Edit backend/.env file"
echo "   - API_ID=your_id"
echo "   - API_HASH=your_hash"
echo ""
echo "3. Create GitHub release:"
echo "   git tag v1.0.0"
echo "   git push origin v1.0.0"
echo ""
echo "=========================================="

print_success "Production build completed! 🎉"
