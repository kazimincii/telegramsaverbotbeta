# Application Icons

This directory contains the application icons for different platforms.

## Required Icon Files

### Windows
- **icon.ico** - Windows icon file (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)

### macOS
- **icon.icns** - macOS icon file (includes all required sizes)
- **dmg-background.png** - Background image for DMG installer (540x380)

### Linux
- **icon.png** - Linux icon file (512x512 PNG)

## How to Generate Icons

### From SVG (Recommended)

The `icon.svg` file is provided as a template. Use it to generate platform-specific icons:

#### Option 1: Online Tools
- Use https://cloudconvert.com/svg-to-ico (for .ico)
- Use https://cloudconvert.com/svg-to-icns (for .icns)
- Use https://cloudconvert.com/svg-to-png (for .png)

#### Option 2: Using electron-icon-builder
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./icon.svg --output=./
```

#### Option 3: Using ImageMagick
```bash
# For PNG
convert icon.svg -resize 512x512 icon.png

# For ICO (Windows)
convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# For ICNS (macOS) - requires png2icns
# First create PNGs
for size in 16 32 64 128 256 512 1024; do
  convert icon.svg -resize ${size}x${size} icon_${size}.png
done
# Then use png2icns or iconutil
```

#### Option 4: Using sharp (Node.js)
```bash
npm install sharp
node -e "
const sharp = require('sharp');
sharp('icon.svg')
  .resize(512, 512)
  .png()
  .toFile('icon.png');
"
```

## DMG Background

Create a `dmg-background.png` file (540x380 pixels) for macOS installer.

You can use the provided `icon.svg` as a base or create a custom background.

## Default Behavior

If icon files are not provided, electron-builder will use default Electron icons.
It's recommended to provide custom icons for a professional look.

## Icon Design Guidelines

- **Simple & Clear**: Icons should be recognizable at small sizes
- **Consistent**: Use the same design language across platforms
- **Brand Colors**: Telegram blue (#0088cc) is used in the template
- **Scalable**: SVG format ensures crisp rendering at all sizes

## Current Template

The provided `icon.svg` features:
- Telegram blue background (#0088cc)
- Simplified Telegram paper plane design
- Download arrow in the center
- Clean, modern look

Feel free to customize this template or replace it with your own design!
