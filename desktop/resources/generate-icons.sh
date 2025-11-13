#!/bin/bash

# Icon Generation Script
# Generates all required icon formats from icon.svg

set -e  # Exit on error

echo "=========================================="
echo "  Telegram Saver - Icon Generator"
echo "=========================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ERROR: ImageMagick is not installed!"
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: choco install imagemagick"
    echo ""
    exit 1
fi

# Check if icon.svg exists
if [ ! -f "icon.svg" ]; then
    echo "❌ ERROR: icon.svg not found!"
    echo "Please create icon.svg first."
    exit 1
fi

echo "✅ ImageMagick found"
echo "✅ icon.svg found"
echo ""

# Create temporary directory
TEMP_DIR="temp_icons"
mkdir -p "$TEMP_DIR"

echo "📦 Generating icons..."
echo ""

# Generate PNG icons (various sizes)
echo "🔹 Generating PNG icons..."
for size in 16 32 48 64 128 256 512 1024; do
    echo "  - ${size}x${size}"
    convert icon.svg -resize ${size}x${size} "$TEMP_DIR/icon_${size}.png"
done

# Generate main icon.png (512x512)
echo "  - icon.png (512x512)"
convert icon.svg -resize 512x512 icon.png

# Generate Windows ICO (multi-resolution)
echo ""
echo "🔹 Generating Windows ICO..."
convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
echo "  - icon.ico ✓"

# Generate macOS ICNS
echo ""
echo "🔹 Generating macOS ICNS..."

# Create iconset directory
ICONSET_DIR="$TEMP_DIR/icon.iconset"
mkdir -p "$ICONSET_DIR"

# Generate all required sizes for macOS
declare -a SIZES=(16 32 64 128 256 512 1024)
for size in "${SIZES[@]}"; do
    convert icon.svg -resize ${size}x${size} "$ICONSET_DIR/icon_${size}x${size}.png"

    # Generate @2x versions
    if [ $size -le 512 ]; then
        size2x=$((size * 2))
        convert icon.svg -resize ${size2x}x${size2x} "$ICONSET_DIR/icon_${size}x${size}@2x.png"
    fi
done

# Check if iconutil is available (macOS only)
if command -v iconutil &> /dev/null; then
    echo "  - Using iconutil (native macOS tool)"
    iconutil -c icns "$ICONSET_DIR" -o icon.icns
    echo "  - icon.icns ✓"
else
    echo "  ⚠️  iconutil not available (macOS only tool)"
    echo "  - Copying largest PNG as placeholder"
    cp "$TEMP_DIR/icon_512.png" icon.icns
    echo "  - Please generate icon.icns on macOS using iconutil"
fi

# Generate DMG background (if not exists)
echo ""
echo "🔹 Generating DMG background..."
if [ ! -f "dmg-background.png" ]; then
    # Create a simple background (540x380)
    convert -size 540x380 xc:#1a1a2e \
        -font Arial -pointsize 24 -fill white \
        -gravity center -annotate +0-50 "Telegram Saver Bot" \
        -pointsize 16 -annotate +0+0 "Drag to Applications folder to install" \
        dmg-background.png
    echo "  - dmg-background.png ✓"
else
    echo "  - dmg-background.png already exists (skipped)"
fi

# Clean up temp directory
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

# Summary
echo ""
echo "=========================================="
echo "  ✅ Icon Generation Complete!"
echo "=========================================="
echo ""
echo "Generated files:"
echo "  ✓ icon.png (512x512) - Linux/General"
echo "  ✓ icon.ico - Windows"
echo "  ✓ icon.icns - macOS"
echo "  ✓ dmg-background.png - macOS DMG installer"
echo ""
echo "These icons are now ready for use in:"
echo "  - desktop/package.json (build configuration)"
echo "  - Electron app packaging"
echo ""
