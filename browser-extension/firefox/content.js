/**
 * Telegram Saver Browser Extension - Content Script
 * Detects Telegram links and content on web pages
 */

const TELEGRAM_LINK_REGEX = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[^\s<>"]+/gi;
const TELEGRAM_DOMAINS = ['t.me', 'telegram.me', 'web.telegram.org'];

// Track detected links
let detectedTelegramLinks = new Set();
let observerInitialized = false;

/**
 * Initialize content script
 */
function init() {
  console.log('Telegram Saver content script loaded');

  // Scan page for Telegram links
  scanPageForTelegramLinks();

  // Watch for dynamically added content
  setupMutationObserver();

  // Add visual indicators to Telegram links
  highlightTelegramLinks();

  // Check if we're on a Telegram domain
  if (isTelegramDomain()) {
    console.log('On Telegram domain, enabling enhanced features');
    enableTelegramDomainFeatures();
  }
}

/**
 * Scan page for Telegram links
 */
function scanPageForTelegramLinks() {
  const textContent = document.body.innerText || '';
  const links = textContent.match(TELEGRAM_LINK_REGEX) || [];

  // Also check href attributes
  const anchorLinks = Array.from(document.querySelectorAll('a[href*="t.me"], a[href*="telegram.me"]'))
    .map(a => a.href);

  const allLinks = [...new Set([...links, ...anchorLinks])];

  if (allLinks.length > 0) {
    console.log('Found Telegram links:', allLinks);
    detectedTelegramLinks = new Set(allLinks);

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'telegram-links-found',
      links: Array.from(detectedTelegramLinks)
    });
  }
}

/**
 * Setup mutation observer for dynamic content
 */
function setupMutationObserver() {
  if (observerInitialized) return;

  const observer = new MutationObserver((mutations) => {
    let shouldRescan = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldRescan = true;
        break;
      }
    }

    if (shouldRescan) {
      scanPageForTelegramLinks();
      highlightTelegramLinks();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  observerInitialized = true;
}

/**
 * Highlight Telegram links with visual indicator
 */
function highlightTelegramLinks() {
  const links = document.querySelectorAll('a[href*="t.me"], a[href*="telegram.me"]');

  links.forEach(link => {
    if (link.dataset.telegramSaverProcessed) return;

    // Add visual indicator
    link.style.borderBottom = '2px solid #0088cc';
    link.style.position = 'relative';

    // Add tooltip
    link.title = 'Telegram link - Right-click to send to Telegram Saver';

    // Add click indicator
    const indicator = document.createElement('span');
    indicator.textContent = '📱';
    indicator.style.cssText = `
      margin-left: 4px;
      font-size: 12px;
      opacity: 0.7;
      cursor: pointer;
    `;
    indicator.title = 'Send to Telegram Saver';

    // Click handler to send directly
    indicator.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const response = await chrome.runtime.sendMessage({
        action: 'send-telegram-link',
        url: link.href
      });

      if (response && response.success) {
        // Show success feedback
        indicator.textContent = '✅';
        setTimeout(() => {
          indicator.textContent = '📱';
        }, 2000);
      }
    });

    link.appendChild(indicator);
    link.dataset.telegramSaverProcessed = 'true';
  });
}

/**
 * Check if current page is on a Telegram domain
 */
function isTelegramDomain() {
  const hostname = window.location.hostname;
  return TELEGRAM_DOMAINS.some(domain => hostname.includes(domain));
}

/**
 * Enable enhanced features for Telegram domains
 */
function enableTelegramDomainFeatures() {
  // Add floating action button for quick send
  addFloatingActionButton();

  // Monitor for media elements
  monitorTelegramMedia();
}

/**
 * Add floating action button for Telegram pages
 */
function addFloatingActionButton() {
  const fab = document.createElement('div');
  fab.id = 'telegram-saver-fab';
  fab.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: #0088cc;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,136,204,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 99999;
      transition: all 0.3s ease;
    " class="telegram-saver-fab">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </div>
  `;

  fab.querySelector('.telegram-saver-fab').addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.1)';
  });

  fab.querySelector('.telegram-saver-fab').addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
  });

  fab.querySelector('.telegram-saver-fab').addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({
      action: 'check-connection'
    });

    if (response && response.connected) {
      showQuickSendMenu();
    } else {
      alert('Telegram Saver desktop app is not running.\nPlease start the app and try again.');
    }
  });

  document.body.appendChild(fab);
}

/**
 * Show quick send menu
 */
function showQuickSendMenu() {
  // Remove existing menu if any
  const existingMenu = document.getElementById('telegram-saver-menu');
  if (existingMenu) {
    existingMenu.remove();
    return;
  }

  const menu = document.createElement('div');
  menu.id = 'telegram-saver-menu';
  menu.innerHTML = `
    <div style="
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 12px;
      z-index: 99999;
      min-width: 200px;
    ">
      <div style="font-weight: bold; margin-bottom: 8px; color: #333;">Quick Actions</div>
      <div class="menu-item" data-action="send-page">📄 Send Current Page</div>
      <div class="menu-item" data-action="send-links">🔗 Send All Links (${detectedTelegramLinks.size})</div>
      <div class="menu-item" data-action="send-media">🖼️ Send All Media</div>
      <div class="menu-item" data-action="open-saver">🚀 Open Telegram Saver</div>
    </div>
  `;

  // Add styles to menu items
  const menuItems = menu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.2s;
      margin: 4px 0;
    `;

    item.addEventListener('mouseenter', function() {
      this.style.background = '#f0f0f0';
    });

    item.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
    });

    item.addEventListener('click', function() {
      handleQuickAction(this.dataset.action);
      menu.remove();
    });
  });

  document.body.appendChild(menu);

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && !e.target.closest('#telegram-saver-fab')) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

/**
 * Handle quick action
 */
async function handleQuickAction(action) {
  console.log('Quick action:', action);

  switch (action) {
    case 'send-page':
      await chrome.runtime.sendMessage({
        action: 'send-telegram-link',
        url: window.location.href
      });
      break;

    case 'send-links':
      for (const link of detectedTelegramLinks) {
        await chrome.runtime.sendMessage({
          action: 'send-telegram-link',
          url: link
        });
      }
      alert(`Sent ${detectedTelegramLinks.size} Telegram links to Saver`);
      break;

    case 'send-media':
      const mediaElements = document.querySelectorAll('img, video');
      console.log(`Found ${mediaElements.length} media elements`);
      alert('Media sending feature coming soon!');
      break;

    case 'open-saver':
      // Open desktop app (if protocol handler is set up)
      window.location.href = 'telegram-saver://open';
      break;
  }
}

/**
 * Monitor Telegram media elements
 */
function monitorTelegramMedia() {
  // Specific to web.telegram.org
  if (window.location.hostname.includes('web.telegram.org')) {
    console.log('Monitoring Telegram Web media');

    // Add download buttons to media
    const observer = new MutationObserver(() => {
      const mediaMessages = document.querySelectorAll('[class*="media"]');
      mediaMessages.forEach(addDownloadButton);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

/**
 * Add download button to media element
 */
function addDownloadButton(mediaElement) {
  if (mediaElement.dataset.telegramSaverButton) return;

  const button = document.createElement('button');
  button.textContent = '💾 Save';
  button.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    background: #0088cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    z-index: 100;
  `;

  button.addEventListener('click', () => {
    console.log('Save media:', mediaElement);
    // Extract media URL and send to desktop app
  });

  if (mediaElement.style.position !== 'absolute' && mediaElement.style.position !== 'relative') {
    mediaElement.style.position = 'relative';
  }

  mediaElement.appendChild(button);
  mediaElement.dataset.telegramSaverButton = 'true';
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'rescan-page') {
    scanPageForTelegramLinks();
    sendResponse({ success: true, links: Array.from(detectedTelegramLinks) });
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
