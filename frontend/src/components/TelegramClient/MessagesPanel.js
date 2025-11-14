import React, { useState, useEffect, useRef } from 'react';
import './MessagesPanel.css';

const MessagesPanel = ({ selectedChat, messages, onLoadMore, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedChat) {
    return (
      <div className="messages-panel empty">
        <div className="empty-messages">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="55" fill="#f0f2f5"/>
            <path d="M60 30c-16.5 0-30 11.2-30 25 0 5.5 2 10.7 5.5 15L32 85l15.5-3.5c3.8 1.7 8 2.5 12.5 2.5 16.5 0 30-11.2 30-25s-13.5-25-30-25z" fill="#fff"/>
            <circle cx="47" cy="57" r="3" fill="#999"/>
            <circle cx="60" cy="57" r="3" fill="#999"/>
            <circle cx="73" cy="57" r="3" fill="#999"/>
          </svg>
          <h3>Select a chat to start messaging</h3>
          <p>Choose a conversation from the sidebar to view messages</p>
        </div>
      </div>
    );
  }

  const filteredMessages = searchQuery
    ? messages.filter(msg => msg.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="messages-panel">
      {/* Chat Header */}
      <div className="messages-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {selectedChat.title?.[0] || '?'}
          </div>
          <div className="chat-header-details">
            <h2 className="chat-header-title">{selectedChat.title || 'Unknown'}</h2>
            <p className="chat-header-status">
              {selectedChat.is_group ? `${selectedChat.participants_count || 0} members` : 'Last seen recently'}
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="header-action-btn" title="Search in chat">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="header-action-btn" title="More options">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="4" r="2" fill="currentColor"/>
              <circle cx="10" cy="10" r="2" fill="currentColor"/>
              <circle cx="10" cy="16" r="2" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="messages-list">
        {loading && messages.length === 0 ? (
          <div className="messages-loading">
            <div className="spinner-large"></div>
            <p>Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="no-messages">
            <p>No messages found</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((message, index) => {
              const isOutgoing = message.is_outgoing;
              const showAvatar = !isOutgoing && (
                index === 0 ||
                filteredMessages[index - 1].sender_id !== message.sender_id
              );
              const showDate = (
                index === 0 ||
                new Date(message.date * 1000).toDateString() !==
                new Date(filteredMessages[index - 1].date * 1000).toDateString()
              );

              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="message-date">
                      {new Date(message.date * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  <div className={`message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                    {showAvatar && !isOutgoing && (
                      <div className="message-avatar">
                        {message.sender_name?.[0] || '?'}
                      </div>
                    )}
                    <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                      {!isOutgoing && message.sender_name && (
                        <div className="message-sender">{message.sender_name}</div>
                      )}
                      {message.text && (
                        <div className="message-text">{message.text}</div>
                      )}
                      {message.media_type && (
                        <div className="message-media">
                          {message.media_type === 'photo' && (
                            <div className="media-photo">
                              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <rect width="40" height="40" rx="8" fill="#e0e0e0"/>
                                <path d="M15 15l5 5 5-5 5 5v10H10V20l5-5z" fill="#999"/>
                              </svg>
                              <span>Photo</span>
                            </div>
                          )}
                          {message.media_type === 'video' && (
                            <div className="media-video">
                              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <rect width="40" height="40" rx="8" fill="#e0e0e0"/>
                                <path d="M15 12l12 8-12 8V12z" fill="#999"/>
                              </svg>
                              <span>Video</span>
                            </div>
                          )}
                          {message.media_type === 'document' && (
                            <div className="media-document">
                              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <rect width="40" height="40" rx="8" fill="#e0e0e0"/>
                                <path d="M15 10h8l5 5v15H12V10h3zm8 0v5h5" stroke="#999" strokeWidth="2"/>
                              </svg>
                              <span>Document</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="message-footer">
                        <span className="message-time">
                          {new Date(message.date * 1000).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isOutgoing && (
                          <svg className="message-read-status" width="16" height="12" viewBox="0 0 16 12" fill="none">
                            <path d="M1 6l4 4L14 2M5 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <button className="input-action-btn" title="Attach file">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17 10l-7 7-7-7M10 3v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          disabled
        />
        <button className="input-action-btn" title="Send message" disabled>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessagesPanel;
