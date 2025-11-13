/**
 * Telegram Saver Browser Extension - Popup Script
 * Manages the extension popup UI
 */

const API_BASE = 'http://localhost:8000';

// State
let currentTab = null;
let detectedLinks = [];
let isConnected = false;
let sentToday = 0;

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup initialized');

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Load stats from storage
  loadStats();

  // Check connection
  await checkConnection();

  // Load detected links
  await loadDetectedLinks();

  // Setup event listeners
  setupEventListeners();

  // Update UI periodically
  setInterval(checkConnection, 10000);
});

/**
 * Check desktop app connection
 */
async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE}/api/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    const data = await response.json();
    isConnected = data.success && data.status === 'ok';

    updateConnectionStatus(true);
  } catch (error) {
    isConnected = false;
    updateConnectionStatus(false);
  }
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(connected) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const sendAllBtn = document.getElementById('sendAllLinks');
  const sendPageBtn = document.getElementById('sendCurrentPage');

  if (connected) {
    statusDot.classList.remove('disconnected');
    statusText.textContent = 'Desktop app connected';
    sendAllBtn.disabled = detectedLinks.length === 0;
    sendPageBtn.disabled = false;
  } else {
    statusDot.classList.add('disconnected');
    statusText.textContent = 'Desktop app not running';
    sendAllBtn.disabled = true;
    sendPageBtn.disabled = true;
  }
}

/**
 * Load detected links from current page
 */
async function loadDetectedLinks() {
  if (!currentTab) return;

  try {
    // Request content script to scan page
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'rescan-page'
    });

    if (response && response.success) {
      detectedLinks = response.links || [];
      updateLinksUI();
    }
  } catch (error) {
    console.error('Failed to load links:', error);
    // Page might not have content script injected
    detectedLinks = [];
    updateLinksUI();
  }
}

/**
 * Update links UI
 */
function updateLinksUI() {
  const linksList = document.getElementById('linksList');
  const linksCount = document.getElementById('linksCount');
  const linkCount = document.getElementById('linkCount');
  const sendAllBtn = document.getElementById('sendAllLinks');

  linksCount.textContent = detectedLinks.length;
  linkCount.textContent = detectedLinks.length;

  if (detectedLinks.length === 0) {
    linksList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>No Telegram links found on this page</div>
      </div>
    `;
    sendAllBtn.disabled = true;
  } else {
    linksList.innerHTML = detectedLinks.map((link, index) => `
      <div class="link-item">
        <div class="link-url" title="${escapeHtml(link)}">${escapeHtml(truncateUrl(link))}</div>
        <button class="link-send" data-link="${escapeHtml(link)}" data-index="${index}">
          Send
        </button>
      </div>
    `).join('');

    // Add click handlers to send buttons
    document.querySelectorAll('.link-send').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const link = e.target.dataset.link;
        const index = e.target.dataset.index;
        await sendLink(link, e.target);
      });
    });

    sendAllBtn.disabled = !isConnected;
  }
}

/**
 * Send link to desktop app
 */
async function sendLink(url, button) {
  if (!isConnected) {
    showNotification('Desktop app not connected', 'error');
    return;
  }

  const originalText = button.textContent;
  button.textContent = 'Sending...';
  button.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/api/extension/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        source_url: currentTab.url,
        source_title: currentTab.title,
        is_telegram_link: true,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      button.textContent = '✓ Sent';
      button.style.background = '#10b981';
      incrementSentCount();

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.disabled = false;
      }, 2000);
    } else {
      button.textContent = 'Error';
      button.style.background = '#ef4444';
      showNotification(`Error: ${data.error}`, 'error');

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
        button.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Send link error:', error);
    button.textContent = 'Error';
    button.style.background = '#ef4444';
    showNotification('Failed to send link', 'error');

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.disabled = false;
    }, 2000);
  }
}

/**
 * Send all links
 */
async function sendAllLinks() {
  if (!isConnected || detectedLinks.length === 0) return;

  const sendAllBtn = document.getElementById('sendAllLinks');
  sendAllBtn.disabled = true;
  sendAllBtn.innerHTML = '⏳ Sending...';

  let successCount = 0;
  let failCount = 0;

  for (const link of detectedLinks) {
    try {
      const response = await fetch(`${API_BASE}/api/extension/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: link,
          source_url: currentTab.url,
          source_title: currentTab.title,
          is_telegram_link: true,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (data.success) {
        successCount++;
        incrementSentCount();
      } else {
        failCount++;
      }
    } catch (error) {
      console.error('Send link error:', error);
      failCount++;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  sendAllBtn.innerHTML = `✓ Sent ${successCount}/${detectedLinks.length}`;
  sendAllBtn.style.background = '#10b981';

  setTimeout(() => {
    sendAllBtn.innerHTML = `🔗 Send All Links (<span id="linkCount">${detectedLinks.length}</span>)`;
    sendAllBtn.style.background = '';
    sendAllBtn.disabled = false;
  }, 3000);

  if (failCount > 0) {
    showNotification(`Sent ${successCount} links, ${failCount} failed`, 'warning');
  } else {
    showNotification(`Successfully sent ${successCount} links`, 'success');
  }
}

/**
 * Send current page
 */
async function sendCurrentPage() {
  if (!isConnected) return;

  const sendPageBtn = document.getElementById('sendCurrentPage');
  sendPageBtn.disabled = true;
  sendPageBtn.innerHTML = '⏳ Sending...';

  try {
    const response = await fetch(`${API_BASE}/api/extension/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentTab.url,
        source_url: currentTab.url,
        source_title: currentTab.title,
        is_telegram_link: currentTab.url.includes('t.me') || currentTab.url.includes('telegram.me'),
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (data.success) {
      sendPageBtn.innerHTML = '✓ Sent';
      sendPageBtn.style.background = '#10b981';
      incrementSentCount();

      setTimeout(() => {
        sendPageBtn.innerHTML = '📄 Send Current Page';
        sendPageBtn.style.background = '';
        sendPageBtn.disabled = false;
      }, 2000);
    } else {
      sendPageBtn.innerHTML = '✗ Error';
      sendPageBtn.style.background = '#ef4444';
      showNotification(`Error: ${data.error}`, 'error');

      setTimeout(() => {
        sendPageBtn.innerHTML = '📄 Send Current Page';
        sendPageBtn.style.background = '';
        sendPageBtn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Send page error:', error);
    sendPageBtn.innerHTML = '✗ Error';
    sendPageBtn.style.background = '#ef4444';
    showNotification('Failed to send page', 'error');

    setTimeout(() => {
      sendPageBtn.innerHTML = '📄 Send Current Page';
      sendPageBtn.style.background = '';
      sendPageBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Open desktop app
 */
function openDesktopApp() {
  // Try protocol handler first
  window.location.href = 'telegram-saver://open';

  // Fallback: open localhost
  setTimeout(() => {
    window.open('http://localhost:8000', '_blank');
  }, 500);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById('sendAllLinks').addEventListener('click', sendAllLinks);
  document.getElementById('sendCurrentPage').addEventListener('click', sendCurrentPage);
  document.getElementById('openDesktopApp').addEventListener('click', openDesktopApp);
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

/**
 * Load stats from storage
 */
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['sentToday', 'lastResetDate']);

    const today = new Date().toDateString();
    if (result.lastResetDate !== today) {
      // Reset counter for new day
      sentToday = 0;
      await chrome.storage.local.set({
        sentToday: 0,
        lastResetDate: today
      });
    } else {
      sentToday = result.sentToday || 0;
    }

    updateStatsUI();
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Increment sent count
 */
async function incrementSentCount() {
  sentToday++;
  await chrome.storage.local.set({ sentToday });
  updateStatsUI();
}

/**
 * Update stats UI
 */
function updateStatsUI() {
  document.getElementById('sentCount').textContent = sentToday;
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Use chrome notifications API
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: 'Telegram Saver',
    message: message
  });
}

/**
 * Utility: Truncate URL
 */
function truncateUrl(url, maxLength = 45) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
