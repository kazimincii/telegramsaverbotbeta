import React, { useState, useEffect, useRef } from 'react';
import './RealtimeCollaboration.css';

const RealtimeCollaboration = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentUser] = useState({ id: 'user123', name: 'John Doe' }); // Mock user

  // Chat state
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    room_type: 'public'
  });

  // Presence state
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userStatus, setUserStatus] = useState('online');

  // Activity state
  const [activities, setActivities] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadRooms();
    loadOnlineUsers();
    loadActivities();
    loadNotifications();
    updatePresence('online');

    // Simulate real-time updates (in production, use WebSocket)
    const interval = setInterval(() => {
      if (selectedRoom) {
        loadMessages(selectedRoom);
      }
      loadOnlineUsers();
      loadActivities();
      loadNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updatePresence = async (status) => {
    try {
      await fetch('http://localhost:5000/api/collaboration/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          username: currentUser.name,
          status: status
        })
      });
      setUserStatus(status);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/collaboration/rooms?user_id=${currentUser.id}`);
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
        if (data.rooms.length > 0 && !selectedRoom) {
          setSelectedRoom(data.rooms[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/collaboration/messages?room_id=${roomId}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages.reverse());
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/collaboration/presence');
      const data = await response.json();
      if (data.success) {
        setOnlineUsers(data.online_users);
      }
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/collaboration/activities?limit=50');
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/collaboration/notifications?user_id=${currentUser.id}`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name) {
      alert('Please enter a room name');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/collaboration/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRoom,
          created_by: currentUser.id,
          members: [currentUser.id]
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateRoom(false);
        setNewRoom({ name: '', description: '', room_type: 'public' });
        loadRooms();
        alert('Room created successfully!');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const response = await fetch('http://localhost:5000/api/collaboration/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoom,
          user_id: currentUser.id,
          username: currentUser.name,
          content: newMessage,
          message_type: 'text'
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages(selectedRoom);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      await fetch('http://localhost:5000/api/collaboration/messages/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          user_id: currentUser.id,
          emoji: emoji
        })
      });
      loadMessages(selectedRoom);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/collaboration/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      online: '#4caf50',
      offline: '#999',
      away: '#ff9800',
      busy: '#f44336',
      dnd: '#9c27b0'
    };
    return colors[status] || '#999';
  };

  const getStatusIcon = (status) => {
    const icons = {
      online: '🟢',
      offline: '⚫',
      away: '🟡',
      busy: '🔴',
      dnd: '🟣'
    };
    return icons[status] || '⚫';
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      user_joined: '👋',
      user_left: '👋',
      file_uploaded: '📤',
      file_downloaded: '📥',
      file_shared: '📎',
      message_sent: '💬',
      task_created: '✅',
      task_completed: '🎉',
      comment_added: '💭'
    };
    return icons[activityType] || '📌';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'şimdi';
    if (minutes < 60) return `${minutes}dk önce`;
    if (hours < 24) return `${hours}sa önce`;
    if (days < 7) return `${days}g önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const renderChatTab = () => (
    <div className="chat-container">
      {/* Sidebar with rooms */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Sohbet Odaları</h3>
          <button className="btn-icon" onClick={() => setShowCreateRoom(true)}>
            ➕
          </button>
        </div>

        <div className="rooms-list">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`room-item ${selectedRoom === room.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedRoom(room.id);
                loadMessages(room.id);
              }}
            >
              <div className="room-icon">
                {room.room_type === 'direct' ? '👤' : room.room_type === 'private' ? '🔒' : '👥'}
              </div>
              <div className="room-info">
                <div className="room-name">{room.name}</div>
                <div className="room-meta">
                  {room.message_count} mesaj • {room.members.length} üye
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        {selectedRoom ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-info">
                <h3>{rooms.find(r => r.id === selectedRoom)?.name}</h3>
                <p>{rooms.find(r => r.id === selectedRoom)?.description}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.user_id === currentUser.id ? 'own' : ''}`}
                >
                  <div className="message-avatar">
                    {message.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-username">{message.username}</span>
                      <span className="message-time">{formatDate(message.created_at)}</span>
                    </div>
                    <div className="message-text">{message.content}</div>
                    {Object.keys(message.reactions).length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          <span
                            key={emoji}
                            className="reaction"
                            onClick={() => handleAddReaction(message.id, emoji)}
                          >
                            {emoji} {users.length}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="message-actions">
                      <button onClick={() => handleAddReaction(message.id, '👍')}>👍</button>
                      <button onClick={() => handleAddReaction(message.id, '❤️')}>❤️</button>
                      <button onClick={() => handleAddReaction(message.id, '😂')}>😂</button>
                      <button onClick={() => handleAddReaction(message.id, '🎉')}>🎉</button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form className="message-input-container" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="message-input"
                placeholder="Mesajınızı yazın..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn-send">
                📤 Gönder
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <p>Sohbet başlatmak için bir oda seçin</p>
          </div>
        )}
      </div>

      {/* Create room modal */}
      {showCreateRoom && (
        <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Yeni Oda Oluştur</h3>

            <div className="form-group">
              <label>Oda Adı:</label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                placeholder="Genel Sohbet"
              />
            </div>

            <div className="form-group">
              <label>Açıklama:</label>
              <input
                type="text"
                value={newRoom.description}
                onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                placeholder="Herkesin katılabileceği genel sohbet odası"
              />
            </div>

            <div className="form-group">
              <label>Oda Tipi:</label>
              <select
                value={newRoom.room_type}
                onChange={(e) => setNewRoom({...newRoom, room_type: e.target.value})}
              >
                <option value="public">Herkese Açık</option>
                <option value="private">Özel</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateRoom(false)}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleCreateRoom}>
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPresenceTab = () => (
    <div className="presence-section">
      <div className="section-header">
        <h3>Çevrimiçi Kullanıcılar</h3>
        <div className="status-selector">
          <label>Durumunuz:</label>
          <select value={userStatus} onChange={(e) => updatePresence(e.target.value)}>
            <option value="online">🟢 Çevrimiçi</option>
            <option value="away">🟡 Uzakta</option>
            <option value="busy">🔴 Meşgul</option>
            <option value="dnd">🟣 Rahatsız Etmeyin</option>
          </select>
        </div>
      </div>

      <div className="users-grid">
        {onlineUsers.map((user) => (
          <div key={user.user_id} className="user-card">
            <div className="user-avatar" style={{ borderColor: getStatusColor(user.status) }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.username}</div>
              <div className="user-status">
                {getStatusIcon(user.status)} {user.status}
              </div>
              <div className="user-last-seen">
                Son görülme: {formatDate(user.last_seen)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {onlineUsers.length === 0 && (
        <div className="empty-state">
          <p>Çevrimiçi kullanıcı yok</p>
        </div>
      )}
    </div>
  );

  const renderActivityTab = () => (
    <div className="activity-section">
      <div className="section-header">
        <h3>Aktivite Akışı</h3>
      </div>

      <div className="activity-feed">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-icon">
              {getActivityIcon(activity.activity_type)}
            </div>
            <div className="activity-content">
              <div className="activity-description">{activity.description}</div>
              <div className="activity-meta">
                <span className="activity-user">{activity.username}</span>
                <span className="activity-time">{formatDate(activity.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="empty-state">
          <p>Henüz aktivite yok</p>
        </div>
      )}
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="notifications-section">
      <div className="section-header">
        <h3>Bildirimler</h3>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount} okunmamış</span>
        )}
      </div>

      <div className="notifications-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
            onClick={() => !notification.is_read && handleMarkNotificationRead(notification.id)}
          >
            <div className="notification-icon">
              {notification.notification_type === 'mention' && '👤'}
              {notification.notification_type === 'reply' && '💬'}
              {notification.notification_type === 'reaction' && '❤️'}
              {notification.notification_type === 'file_shared' && '📎'}
              {notification.notification_type === 'task_assigned' && '✅'}
              {notification.notification_type === 'system' && '🔔'}
            </div>
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">{formatDate(notification.created_at)}</div>
            </div>
            {!notification.is_read && <div className="unread-indicator" />}
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="empty-state">
          <p>Bildirim yok</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="realtime-collaboration">
      {/* Header */}
      <div className="collab-header">
        <h2>💬 Gerçek Zamanlı İşbirliği</h2>
        <p>Anlık mesajlaşma, durum takibi ve aktivite akışı</p>
      </div>

      {/* Tabs */}
      <div className="collab-tabs">
        <button
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-icon">💬</span>
          Sohbet
        </button>

        <button
          className={`tab-button ${activeTab === 'presence' ? 'active' : ''}`}
          onClick={() => setActiveTab('presence')}
        >
          <span className="tab-icon">👥</span>
          Çevrimiçi ({onlineUsers.length})
        </button>

        <button
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <span className="tab-icon">📊</span>
          Aktivite
        </button>

        <button
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span className="tab-icon">🔔</span>
          Bildirimler
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="collab-content">
        {activeTab === 'chat' && renderChatTab()}
        {activeTab === 'presence' && renderPresenceTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
      </div>
    </div>
  );
};

export default RealtimeCollaboration;
