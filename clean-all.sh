#!/bin/bash

# Clean All - Remove build artifacts, logs, and temp files

set -e

echo "=========================================="
echo "  Telegram Saver - Clean All"
echo "=========================================="
echo ""

# Function to clean a directory
clean_dir() {
    local dir=$1
    local desc=$2

    if [ -d "$dir" ]; then
        echo "🧹 Cleaning $desc..."
        rm -rf "$dir"
        echo "   ✓ Removed $dir"
    fi
}

# Backend cleanup
echo "Backend:"
clean_dir "backend/__pycache__" "Python cache"
clean_dir "backend/.pytest_cache" "Pytest cache"
clean_dir "backend/downloads.db" "Database (if exists)"
clean_dir "backend/downloads.db-shm" "Database temp files"
clean_dir "backend/downloads.db-wal" "Database temp files"
find backend -name "*.pyc" -delete 2>/dev/null || true
find backend -name "*.pyo" -delete 2>/dev/null || true
find backend -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
echo ""

# Frontend cleanup
echo "Frontend:"
clean_dir "frontend/node_modules" "Node modules"
clean_dir "frontend/build" "Build output"
clean_dir "frontend/.cache" "Cache"
echo ""

# Desktop cleanup
echo "Desktop:"
clean_dir "desktop/node_modules" "Node modules"
clean_dir "desktop/dist" "Build output"
clean_dir "desktop/temp_icons" "Temp icons"
echo ""

# Logs
echo "Logs:"
find . -name "*.log" -delete 2>/dev/null || true
clean_dir "logs" "Log directory"
echo ""

echo "=========================================="
echo "  ✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "To reinstall dependencies:"
echo "  Backend:  cd backend && pip install -r requirements.txt"
echo "  Frontend: cd frontend && npm install"
echo "  Desktop:  cd desktop && npm install"
echo ""
