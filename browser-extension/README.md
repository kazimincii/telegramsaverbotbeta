# Telegram Saver Browser Extension

Save Telegram media and messages directly from your browser to the Telegram Saver desktop app.

## Features

✅ **Auto-detect Telegram Links** - Automatically detects t.me and telegram.me links on any webpage
✅ **Right-Click Context Menu** - Send links, images, videos, and text with a right-click
✅ **Visual Indicators** - Highlights Telegram links with clickable icons
✅ **Batch Operations** - Send all detected Telegram links at once
✅ **Floating Action Button** - Quick access on Telegram pages
✅ **Desktop App Integration** - Seamless communication with the desktop app
✅ **Multi-Browser Support** - Chrome, Firefox, and Edge compatible

## Installation

### Chrome / Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension/chrome/` directory
5. The extension icon should appear in your toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select the `manifest.json` file from `browser-extension/firefox/`
4. The extension will be loaded temporarily (for development)

For permanent installation in Firefox:
1. Package the extension: `cd browser-extension/firefox && zip -r ../telegram-saver-firefox.xpi *`
2. Submit to Firefox Add-ons for signing

## Usage

### Prerequisites

Make sure the Telegram Saver desktop app is running on `http://localhost:8000`

### Quick Start

1. **Browse any webpage** - The extension will automatically detect Telegram links
2. **Click the extension icon** - View detected links and send them to your desktop app
3. **Right-click any link/image/video** - Use "Send to Telegram Saver" context menu
4. **On Telegram pages** - Use the floating action button (FAB) for quick actions

### Features in Detail

#### Auto Link Detection
- Scans webpages for `t.me` and `telegram.me` links
- Shows count badge on extension icon
- Adds visual indicators (📱) to detected links

#### Context Menu
Right-click on:
- **Links** - Send URL to desktop app
- **Images** - Send image URL for download
- **Videos** - Send video URL for download
- **Selected Text** - Send text (detects Telegram links within)

#### Popup Interface
Click the extension icon to:
- View all detected Telegram links on current page
- Send individual links or all at once
- Send current page URL
- Open desktop app
- Check connection status

#### Telegram Domain Features
When browsing `t.me`, `telegram.me`, or `web.telegram.org`:
- Floating action button for quick actions
- Enhanced media detection
- Quick send menu with multiple options

## Desktop App API

The extension communicates with the desktop app via these endpoints:

- `POST /api/extension/send-link` - Send a link
- `POST /api/extension/send-media` - Send media URL
- `POST /api/extension/send-text` - Send text content
- `GET /api/ping` - Check if app is running

## Development

### File Structure

```
browser-extension/
├── chrome/              # Chrome/Edge version (Manifest V3)
│   ├── manifest.json
│   ├── background.js    # Service worker
│   ├── content.js       # Content script
│   ├── popup.html       # Popup UI
│   └── popup.js         # Popup logic
├── firefox/             # Firefox version (Manifest V2)
│   └── (same files)
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Key Files

- **manifest.json** - Extension configuration
- **background.js** - Handles context menus, desktop app communication
- **content.js** - Injected into webpages, detects Telegram links
- **popup.html/js** - Extension popup interface

### Testing

1. Start the desktop app: `cd backend && python main.py`
2. Load the extension in your browser
3. Visit a page with Telegram links (e.g., Reddit, Twitter, Telegram Web)
4. Test context menu, popup, and link detection

## Icon Requirements

The extension requires icons in the following sizes:
- 16x16 - Toolbar icon (small)
- 32x32 - Toolbar icon (retina)
- 48x48 - Extension management page
- 128x128 - Chrome Web Store / Firefox Add-ons

Place PNG icons in the `icons/` directory.

## Permissions

The extension requests these permissions:

- **contextMenus** - Right-click menu functionality
- **activeTab** - Access to current tab for content scanning
- **storage** - Store stats and settings
- **tabs** - Tab information for sending page details
- **host_permissions** - Access to localhost:8000 and Telegram domains

## Privacy

- ✅ No data collection
- ✅ No external servers (communicates only with localhost)
- ✅ No analytics or tracking
- ✅ All processing happens locally

## Troubleshooting

### "Desktop app not connected"

- Make sure the Telegram Saver desktop app is running
- Check that it's accessible at `http://localhost:8000`
- Try clicking "Check Connection" in the popup

### Links not detected

- Refresh the page after installing the extension
- Check browser console for errors (F12 → Console)
- The page might be using dynamic content - scroll to load more

### Context menu not working

- Make sure you right-click on a link/image/video element
- Some websites might block context menus
- Try using the extension popup instead

## Building for Production

### Chrome/Edge

1. Update version in `chrome/manifest.json`
2. Create ZIP: `cd browser-extension/chrome && zip -r ../telegram-saver-chrome.zip *`
3. Upload to Chrome Web Store

### Firefox

1. Update version in `firefox/manifest.json`
2. Create XPI: `cd browser-extension/firefox && zip -r ../telegram-saver-firefox.xpi *`
3. Submit to Firefox Add-ons for signing

## License

Part of the Telegram Saver project.

## Support

For issues and feature requests, please open an issue on the main Telegram Saver repository.
