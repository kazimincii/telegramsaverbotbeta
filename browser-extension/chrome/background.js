/**
 * Telegram Saver Browser Extension - Background Service Worker
 * Handles context menus, desktop app communication, and link detection
 */

const API_BASE = 'http://localhost:8000';
const TELEGRAM_LINK_REGEX = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[^\s]+/gi;

// Context menu IDs
const MENU_IDS = {
  SEND_TO_SAVER: 'send-to-saver',
  SEND_LINK: 'send-link',
  SEND_IMAGE: 'send-image',
  SEND_VIDEO: 'send-video',
  SEND_SELECTION: 'send-selection'
};

// Extension state
let desktopAppConnected = false;
let connectionCheckInterval = null;

/**
 * Initialize extension
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Telegram Saver extension installed');
  createContextMenus();
  checkDesktopAppConnection();

  // Check connection every 30 seconds
  connectionCheckInterval = setInterval(checkDesktopAppConnection, 30000);
});

/**
 * Create context menus
 */
function createContextMenus() {
  // Root menu
  chrome.contextMenus.create({
    id: MENU_IDS.SEND_TO_SAVER,
    title: 'Send to Telegram Saver',
    contexts: ['page', 'link', 'image', 'video', 'selection']
  });

  // Send link
  chrome.contextMenus.create({
    id: MENU_IDS.SEND_LINK,
    parentId: MENU_IDS.SEND_TO_SAVER,
    title: 'Send Link',
    contexts: ['link']
  });

  // Send image
  chrome.contextMenus.create({
    id: MENU_IDS.SEND_IMAGE,
    parentId: MENU_IDS.SEND_TO_SAVER,
    title: 'Send Image',
    contexts: ['image']
  });

  // Send video
  chrome.contextMenus.create({
    id: MENU_IDS.SEND_VIDEO,
    parentId: MENU_IDS.SEND_TO_SAVER,
    title: 'Send Video',
    contexts: ['video']
  });

  // Send selected text
  chrome.contextMenus.create({
    id: MENU_IDS.SEND_SELECTION,
    parentId: MENU_IDS.SEND_TO_SAVER,
    title: 'Send Selected Text',
    contexts: ['selection']
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, info);

  switch (info.menuItemId) {
    case MENU_IDS.SEND_LINK:
      handleSendLink(info.linkUrl, tab);
      break;
    case MENU_IDS.SEND_IMAGE:
      handleSendImage(info.srcUrl, tab);
      break;
    case MENU_IDS.SEND_VIDEO:
      handleSendVideo(info.srcUrl, tab);
      break;
    case MENU_IDS.SEND_SELECTION:
      handleSendSelection(info.selectionText, tab);
      break;
  }
});

/**
 * Handle sending link to desktop app
 */
async function handleSendLink(url, tab) {
  if (!desktopAppConnected) {
    notifyUser('Desktop app not connected', 'error');
    return;
  }

  try {
    // Check if it's a Telegram link
    const isTelegramLink = TELEGRAM_LINK_REGEX.test(url);

    const response = await fetch(`${API_BASE}/api/extension/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        source_url: tab.url,
        source_title: tab.title,
        is_telegram_link: isTelegramLink,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      notifyUser('Link sent to Telegram Saver', 'success');

      // If it's a Telegram link, offer to download immediately
      if (isTelegramLink) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: 'Telegram Link Detected',
          message: 'Do you want to download this Telegram content?',
          buttons: [
            { title: 'Download Now' },
            { title: 'Save for Later' }
          ]
        });
      }
    } else {
      notifyUser(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Send link error:', error);
    notifyUser('Failed to send link', 'error');
  }
}

/**
 * Handle sending image to desktop app
 */
async function handleSendImage(imageUrl, tab) {
  if (!desktopAppConnected) {
    notifyUser('Desktop app not connected', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/extension/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_url: imageUrl,
        media_type: 'image',
        source_url: tab.url,
        source_title: tab.title,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      notifyUser('Image sent to Telegram Saver', 'success');
    } else {
      notifyUser(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Send image error:', error);
    notifyUser('Failed to send image', 'error');
  }
}

/**
 * Handle sending video to desktop app
 */
async function handleSendVideo(videoUrl, tab) {
  if (!desktopAppConnected) {
    notifyUser('Desktop app not connected', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/extension/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_url: videoUrl,
        media_type: 'video',
        source_url: tab.url,
        source_title: tab.title,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      notifyUser('Video sent to Telegram Saver', 'success');
    } else {
      notifyUser(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Send video error:', error);
    notifyUser('Failed to send video', 'error');
  }
}

/**
 * Handle sending selected text to desktop app
 */
async function handleSendSelection(text, tab) {
  if (!desktopAppConnected) {
    notifyUser('Desktop app not connected', 'error');
    return;
  }

  try {
    // Check if selection contains Telegram links
    const telegramLinks = text.match(TELEGRAM_LINK_REGEX) || [];

    const response = await fetch(`${API_BASE}/api/extension/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        source_url: tab.url,
        source_title: tab.title,
        telegram_links: telegramLinks,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      if (telegramLinks.length > 0) {
        notifyUser(`Text sent with ${telegramLinks.length} Telegram link(s)`, 'success');
      } else {
        notifyUser('Text sent to Telegram Saver', 'success');
      }
    } else {
      notifyUser(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Send text error:', error);
    notifyUser('Failed to send text', 'error');
  }
}

/**
 * Check if desktop app is running
 */
async function checkDesktopAppConnection() {
  try {
    const response = await fetch(`${API_BASE}/api/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });

    const data = await response.json();
    desktopAppConnected = data.success && data.status === 'ok';

    // Update extension icon based on connection status
    chrome.action.setIcon({
      path: desktopAppConnected
        ? {
            16: '../icons/icon16.png',
            32: '../icons/icon32.png',
            48: '../icons/icon48.png',
            128: '../icons/icon128.png'
          }
        : {
            16: '../icons/icon16-gray.png',
            32: '../icons/icon32-gray.png',
            48: '../icons/icon48-gray.png',
            128: '../icons/icon128-gray.png'
          }
    });

    // Update badge
    chrome.action.setBadgeText({
      text: desktopAppConnected ? '' : '!'
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#ff0000'
    });

  } catch (error) {
    desktopAppConnected = false;
    console.log('Desktop app not connected');
  }
}

/**
 * Show notification to user
 */
function notifyUser(message, type = 'info') {
  const iconUrl = type === 'error' ? '../icons/icon128-error.png' : '../icons/icon128.png';

  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: 'Telegram Saver',
    message: message
  });
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'telegram-links-found') {
    console.log('Telegram links found on page:', request.links);

    // Show page action badge with count
    chrome.action.setBadgeText({
      text: String(request.links.length),
      tabId: sender.tab.id
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#0088cc',
      tabId: sender.tab.id
    });

    sendResponse({ success: true });
  } else if (request.action === 'check-connection') {
    sendResponse({ connected: desktopAppConnected });
  } else if (request.action === 'send-telegram-link') {
    handleSendLink(request.url, sender.tab).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Download Now
    console.log('User clicked Download Now');
    // Trigger download in desktop app
  } else if (buttonIndex === 1) {
    // Save for Later
    console.log('User clicked Save for Later');
  }
});

/**
 * Cleanup on extension unload
 */
chrome.runtime.onSuspend.addListener(() => {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
});
