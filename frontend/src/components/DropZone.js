import React, { useState } from 'react';
import notificationService from '../services/notificationService';

export default function DropZone({ onDrop, accept, children, className = '' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => prev + 1);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => prev - 1);

    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);
    setDragCounter(0);

    try {
      // Handle dropped items
      const items = [];

      // Check for text data (Telegram links, URLs, etc.)
      const text = e.dataTransfer.getData('text/plain');
      if (text) {
        items.push({ type: 'text', data: text });
      }

      // Check for HTML data
      const html = e.dataTransfer.getData('text/html');
      if (html) {
        items.push({ type: 'html', data: html });
      }

      // Check for files
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        items.push({ type: 'files', data: files });
      }

      if (items.length > 0 && onDrop) {
        await onDrop(items);
      }
    } catch (error) {
      console.error('Drop error:', error);
      notificationService.notifyWarning('Drop Error', error.message);
    }
  };

  return (
    <div
      className={`drop-zone ${isDragging ? 'drop-zone-active' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragging && (
        <div className="drop-zone-overlay">
          <div className="drop-zone-indicator">
            <div className="drop-zone-icon">📥</div>
            <div className="drop-zone-text">Drop here to import</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Parse Telegram links from dropped content
 */
export function parseTelegramLinks(text) {
  const links = [];

  // Telegram link patterns
  const patterns = [
    /https?:\/\/t\.me\/([a-zA-Z0-9_]+)/g,
    /https?:\/\/telegram\.me\/([a-zA-Z0-9_]+)/g,
    /https?:\/\/t\.me\/c\/(\d+)\/(\d+)/g, // Private chat links
    /@([a-zA-Z0-9_]{5,})/g // Username mentions
  ];

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      links.push({
        url: match[0],
        username: match[1] || null,
        chatId: match[1] || null,
        messageId: match[2] || null
      });
    }
  });

  return links;
}

/**
 * Extract chat IDs from text
 */
export function extractChatIds(text) {
  const ids = [];

  // Numeric chat IDs (positive and negative)
  const numericPattern = /(?:^|\s)(-?\d{9,})/g;
  const matches = text.matchAll(numericPattern);

  for (const match of matches) {
    ids.push(parseInt(match[1]));
  }

  return ids;
}
