import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ activeTab, onTabChange, user, chats, contacts, onChatSelect, selectedChatId, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.ai_profession?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="telegram-sidebar">
      {/* User Profile Header */}
      <div className="sidebar-header">
        <div className="user-profile">
          <div className="user-avatar">
            {user?.first_name?.[0] || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.first_name || 'User'}</div>
            <div className="user-phone">{user?.phone || ''}</div>
          </div>
        </div>
        <button className="logout-button" onClick={onLogout} title="Logout">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 17H4a2 2 0 01-2-2V5a2 2 0 012-2h3M13 13l4-4m0 0L13 5m4 4H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="sidebar-search">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => onTabChange('chats')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17 8.5A5.5 5.5 0 1012.5 3H7a4 4 0 00-4 4v4.5a4 4 0 004 4h1.5V18l3.5-2.5H17a3 3 0 003-3V8.5z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Chats
        </button>
        <button
          className={`tab ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => onTabChange('contacts')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16 17v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Contacts
        </button>
        <button
          className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => onTabChange('insights')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17v-6m6 6v-4M3 17v-2m6-8V3m6 4V3m-9 8a3 3 0 100-6 3 3 0 000 6zm6 0a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          AI Insights
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="2"/>
            <path d="M17 10a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Settings
        </button>
      </div>

      {/* Content List */}
      <div className="sidebar-content">
        {activeTab === 'chats' && (
          <div className="chats-list">
            {filteredChats.length === 0 ? (
              <div className="empty-state">
                <p>No chats found</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
                  onClick={() => onChatSelect(chat)}
                >
                  <div className="chat-avatar">
                    {chat.title?.[0] || '?'}
                  </div>
                  <div className="chat-info">
                    <div className="chat-header">
                      <span className="chat-title">{chat.title || 'Unknown'}</span>
                      {chat.last_message?.date && (
                        <span className="chat-time">
                          {new Date(chat.last_message.date * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="chat-preview">
                      {chat.last_message?.text || 'No messages yet'}
                    </div>
                  </div>
                  {chat.unread_count > 0 && (
                    <div className="unread-badge">{chat.unread_count}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="contacts-list">
            {filteredContacts.length === 0 ? (
              <div className="empty-state">
                <p>No contacts found</p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="contact-item"
                  onClick={() => onChatSelect(contact)}
                >
                  <div className="contact-avatar">
                    {contact.name?.[0] || '?'}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{contact.name || 'Unknown'}</div>
                    {contact.ai_profession && (
                      <div className="contact-profession">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {contact.ai_profession}
                      </div>
                    )}
                  </div>
                  {contact.confidence && (
                    <div className={`confidence-badge ${contact.confidence > 0.7 ? 'high' : contact.confidence > 0.4 ? 'medium' : 'low'}`}>
                      {Math.round(contact.confidence * 100)}%
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="insights-content">
            <div className="insight-card">
              <h3>Total Contacts</h3>
              <div className="insight-value">{contacts.length}</div>
            </div>
            <div className="insight-card">
              <h3>Total Chats</h3>
              <div className="insight-value">{chats.length}</div>
            </div>
            <div className="insight-card">
              <h3>AI Classified</h3>
              <div className="insight-value">
                {contacts.filter(c => c.ai_profession).length}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-content">
            <div className="setting-item">
              <span>Notifications</span>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <span>Dark Mode</span>
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <span>Auto Sync</span>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
