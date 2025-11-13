const logger = require('./logger');
const { app } = require('electron');

class Analytics {
  constructor() {
    this.sessionStart = Date.now();
    this.events = [];
    this.enabled = false; // Set to true to enable analytics
  }

  // Track application events
  trackEvent(category, action, label = '', value = 0) {
    if (!this.enabled) return;

    const event = {
      timestamp: Date.now(),
      category,
      action,
      label,
      value,
      sessionTime: Date.now() - this.sessionStart
    };

    this.events.push(event);
    logger.info(`[ANALYTICS] ${category}:${action}`, { label, value });

    // Send to analytics service (if configured)
    this.sendToService(event);
  }

  // Track page views (for different sections of the app)
  trackPageView(pageName) {
    this.trackEvent('Navigation', 'PageView', pageName);
  }

  // Track user actions
  trackUserAction(action, details = {}) {
    this.trackEvent('User', action, JSON.stringify(details));
  }

  // Track downloads
  trackDownload(status, details = {}) {
    this.trackEvent('Download', status, JSON.stringify(details));
  }

  // Track errors
  trackError(error, context = {}) {
    this.trackEvent('Error', error.name, error.message);
    logger.error('[ANALYTICS] Error tracked:', error, context);
  }

  // Track performance metrics
  trackPerformance(metric, duration, details = {}) {
    this.trackEvent('Performance', metric, JSON.stringify(details), duration);
  }

  // Track app lifecycle
  trackAppStart() {
    this.trackEvent('Lifecycle', 'AppStart', app.getVersion());
  }

  trackAppQuit() {
    const sessionDuration = Date.now() - this.sessionStart;
    this.trackEvent('Lifecycle', 'AppQuit', '', sessionDuration);
  }

  // Track feature usage
  trackFeatureUsage(featureName, details = {}) {
    this.trackEvent('Feature', 'Used', featureName, 1);
  }

  // Send event to analytics service
  async sendToService(event) {
    if (!this.enabled) return;

    // TODO: Implement sending to your analytics service
    // Examples:
    // - Google Analytics
    // - Mixpanel
    // - Custom analytics server
    // - Amplitude
    // - Segment

    /*
    try {
      const response = await fetch('https://your-analytics-server.com/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...event,
          appVersion: app.getVersion(),
          platform: process.platform,
          userId: this.getUserId() // Implement user ID tracking
        })
      });

      if (!response.ok) {
        logger.warn('[ANALYTICS] Failed to send event to service');
      }
    } catch (err) {
      logger.error('[ANALYTICS] Error sending event:', err);
    }
    */
  }

  // Get or generate anonymous user ID
  getUserId() {
    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs');

    const userIdPath = path.join(app.getPath('userData'), 'user-id.txt');

    try {
      if (fs.existsSync(userIdPath)) {
        return fs.readFileSync(userIdPath, 'utf8').trim();
      } else {
        // Generate new anonymous ID
        const uuid = require('crypto').randomBytes(16).toString('hex');
        fs.writeFileSync(userIdPath, uuid);
        return uuid;
      }
    } catch (err) {
      logger.error('[ANALYTICS] Failed to get/generate user ID:', err);
      return 'unknown';
    }
  }

  // Get analytics summary
  getSummary() {
    const eventsByCategory = {};
    this.events.forEach(event => {
      if (!eventsByCategory[event.category]) {
        eventsByCategory[event.category] = [];
      }
      eventsByCategory[event.category].push(event);
    });

    return {
      sessionDuration: Date.now() - this.sessionStart,
      totalEvents: this.events.length,
      eventsByCategory,
      appVersion: app.getVersion(),
      platform: process.platform
    };
  }

  // Export analytics data
  exportData() {
    return {
      summary: this.getSummary(),
      events: this.events
    };
  }

  // Enable/disable analytics
  setEnabled(enabled) {
    this.enabled = enabled;
    logger.info(`[ANALYTICS] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  // Privacy-focused: Clear all analytics data
  clearData() {
    this.events = [];
    this.sessionStart = Date.now();
    logger.info('[ANALYTICS] Data cleared');
  }
}

// Export singleton instance
module.exports = new Analytics();
