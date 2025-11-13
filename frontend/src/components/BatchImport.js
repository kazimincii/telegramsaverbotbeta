import React, { useState } from 'react';
import DropZone, { parseTelegramLinks, extractChatIds } from './DropZone';
import notificationService from '../services/notificationService';

export default function BatchImport({ onImport }) {
  const [importItems, setImportItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = async (items) => {
    const newItems = [];

    for (const item of items) {
      if (item.type === 'text') {
        // Parse Telegram links
        const links = parseTelegramLinks(item.data);
        links.forEach(link => {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'telegram-link',
            data: link,
            display: link.username ? `@${link.username}` : link.url
          });
        });

        // Extract chat IDs
        const chatIds = extractChatIds(item.data);
        chatIds.forEach(chatId => {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'chat-id',
            data: { chatId },
            display: `Chat ID: ${chatId}`
          });
        });
      } else if (item.type === 'files') {
        // Handle file drops (CSV, JSON, TXT)
        for (const file of item.data) {
          if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            const text = await file.text();
            const links = parseTelegramLinks(text);
            const chatIds = extractChatIds(text);

            links.forEach(link => {
              newItems.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'telegram-link',
                data: link,
                display: link.username ? `@${link.username}` : link.url,
                source: file.name
              });
            });

            chatIds.forEach(chatId => {
              newItems.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'chat-id',
                data: { chatId },
                display: `Chat ID: ${chatId}`,
                source: file.name
              });
            });
          }
        }
      }
    }

    if (newItems.length > 0) {
      setImportItems(prev => [...prev, ...newItems]);
      notificationService.notifySuccess(
        'Items Added',
        `Added ${newItems.length} items to import queue`
      );
    } else {
      notificationService.notifyWarning(
        'No Items Found',
        'Could not find any Telegram links or chat IDs in the dropped content'
      );
    }
  };

  const handleRemoveItem = (id) => {
    setImportItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    setImportItems([]);
  };

  const handleImportAll = async () => {
    if (importItems.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      // Call the import callback
      if (onImport) {
        await onImport(importItems);
      }

      notificationService.notifySuccess(
        'Import Complete',
        `Successfully imported ${importItems.length} items`
      );

      // Clear items after successful import
      setImportItems([]);
    } catch (error) {
      console.error('Import error:', error);
      notificationService.notifyDownloadError({
        message: `Import failed: ${error.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📥 Batch Import</h3>
        <div className="card-description">
          Drop Telegram links, chat IDs, or text files to import multiple chats
        </div>
      </div>

      <div className="card-body">
        <DropZone onDrop={handleDrop}>
          <div className="drop-zone-content">
            <div className="drop-zone-icon-placeholder">📥</div>
            <div className="drop-zone-title">Drop Telegram Links or Files</div>
            <div className="drop-zone-description">
              Drag and drop Telegram links, chat IDs, usernames, or text files here
            </div>
            <div className="drop-zone-hint">
              Supported formats: t.me links, @usernames, chat IDs, .txt, .csv files
            </div>
          </div>
        </DropZone>

        {importItems.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-md font-semibold">
                Import Queue ({importItems.length})
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearAll}
                  disabled={isProcessing}
                >
                  Clear All
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleImportAll}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Importing...' : `Import ${importItems.length} Items`}
                </button>
              </div>
            </div>

            <ul className="import-list">
              {importItems.map(item => (
                <li key={item.id} className="import-item">
                  <div className="import-item-icon">
                    {item.type === 'telegram-link' ? '🔗' : '💬'}
                  </div>
                  <div className="import-item-content">
                    <div className="import-item-title">{item.display}</div>
                    {item.source && (
                      <div className="import-item-subtitle">
                        From: {item.source}
                      </div>
                    )}
                  </div>
                  <div className="import-item-actions">
                    <button
                      className="import-item-remove"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove"
                      disabled={isProcessing}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="text-small text-muted">
          💡 <strong>Tip:</strong> You can paste multiple links or chat IDs separated by newlines,
          or drop a text file containing them.
        </div>
      </div>
    </div>
  );
}
