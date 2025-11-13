@echo off
REM Icon Generation Script for Windows
REM Generates all required icon formats from icon.svg

echo ==========================================
echo   Telegram Saver - Icon Generator
echo ==========================================
echo.

REM Check if ImageMagick is installed
where convert >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: ImageMagick is not installed!
    echo.
    echo Install it with:
    echo   choco install imagemagick
    echo   or download from https://imagemagick.org/
    echo.
    pause
    exit /b 1
)

REM Check if icon.svg exists
if not exist "icon.svg" (
    echo ERROR: icon.svg not found!
    echo Please create icon.svg first.
    pause
    exit /b 1
)

echo [OK] ImageMagick found
echo [OK] icon.svg found
echo.

REM Create temporary directory
set TEMP_DIR=temp_icons
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo Generating icons...
echo.

REM Generate PNG icons (various sizes)
echo - Generating PNG icons...
for %%s in (16 32 48 64 128 256 512 1024) do (
    echo   - %%sx%%s
    convert icon.svg -resize %%sx%%s "%TEMP_DIR%\icon_%%s.png"
)

REM Generate main icon.png (512x512)
echo   - icon.png (512x512)
convert icon.svg -resize 512x512 icon.png

REM Generate Windows ICO (multi-resolution)
echo.
echo - Generating Windows ICO...
convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
echo   - icon.ico [OK]

REM Generate macOS ICNS placeholder
echo.
echo - Generating macOS ICNS placeholder...
copy "%TEMP_DIR%\icon_512.png" icon.icns >nul
echo   - icon.icns (placeholder - generate on macOS for full support)

REM Generate DMG background
echo.
echo - Generating DMG background...
if not exist "dmg-background.png" (
    convert -size 540x380 xc:#1a1a2e ^
        -font Arial -pointsize 24 -fill white ^
        -gravity center -annotate +0-50 "Telegram Saver Bot" ^
        -pointsize 16 -annotate +0+0 "Drag to Applications folder to install" ^
        dmg-background.png
    echo   - dmg-background.png [OK]
) else (
    echo   - dmg-background.png already exists (skipped)
)

REM Clean up temp directory
echo.
echo - Cleaning up...
rmdir /s /q "%TEMP_DIR%"

REM Summary
echo.
echo ==========================================
echo   Icon Generation Complete!
echo ==========================================
echo.
echo Generated files:
echo   [OK] icon.png (512x512) - Linux/General
echo   [OK] icon.ico - Windows
echo   [OK] icon.icns - macOS (placeholder)
echo   [OK] dmg-background.png - macOS DMG installer
echo.
echo These icons are now ready for use in:
echo   - desktop\package.json (build configuration)
echo   - Electron app packaging
echo.
pause
