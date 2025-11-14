import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MessagesPanel from './MessagesPanel';
import AIProfilePanel from './AIProfilePanel';
import './TelegramClient.css';

const TelegramClient = ({ user, apiBaseUrl = 'http://localhost:8000', onLogout }) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    // Load initial data
    loadChats();
    loadContacts();

    // Start sync service
    startSync();
  }, []);

  const loadChats = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/chats`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const startSync = async () => {
    try {
      setSyncStatus('syncing');
      const response = await fetch(`${apiBaseUrl}/api/telegram/start-sync`, {
        method: 'POST'
      });
      if (response.ok) {
        setSyncStatus('synced');
        // Reload data after sync
        setTimeout(() => {
          loadChats();
          loadContacts();
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting sync:', error);
      setSyncStatus('error');
    }
  };

  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/messages/${chat.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);

        // If chat is a user, load their AI profile
        if (!chat.is_group) {
          const contactResponse = await fetch(`${apiBaseUrl}/api/telegram/contact/${chat.id}`);
          if (contactResponse.ok) {
            const contactData = await contactResponse.json();
            setSelectedContact(contactData);
          }
        } else {
          setSelectedContact(null);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates) => {
    if (!selectedContact) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/contact/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_profession: updates.profession,
          ai_sector: updates.sector
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedContact(updated);
        // Update in contacts list
        setContacts(contacts.map(c => c.id === updated.id ? updated : c));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="telegram-client">
      {/* Sync Status Bar */}
      {syncStatus === 'syncing' && (
        <div className="sync-status-bar">
          <div className="sync-spinner"></div>
          <span>Syncing your Telegram data...</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="sync-status-bar error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 4v4M8 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Sync failed. Retrying...</span>
        </div>
      )}

      <div className="telegram-client-layout">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          chats={chats}
          contacts={contacts}
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChat?.id}
          onLogout={onLogout}
        />

        {/* Center Messages Panel */}
        <MessagesPanel
          selectedChat={selectedChat}
          messages={messages}
          loading={loading}
        />

        {/* Right AI Profile Panel */}
        {selectedContact && (
          <AIProfilePanel
            selectedContact={selectedContact}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </div>
    </div>
  );
};

export default TelegramClient;
