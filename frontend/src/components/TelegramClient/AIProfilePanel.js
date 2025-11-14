import React, { useState } from 'react';
import './AIProfilePanel.css';

const AIProfilePanel = ({ selectedContact, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfession, setEditedProfession] = useState('');
  const [editedSector, setEditedSector] = useState('');

  if (!selectedContact) {
    return (
      <div className="ai-profile-panel empty">
        <div className="empty-profile">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="#f0f2f5"/>
            <circle cx="50" cy="35" r="15" fill="#ccc"/>
            <path d="M20 80c0-16.5 13.5-30 30-30s30 13.5 30 30" fill="#ccc"/>
          </svg>
          <p>Select a contact to view AI profile</p>
        </div>
      </div>
    );
  }

  const handleSaveEdit = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        profession: editedProfession,
        sector: editedSector
      });
    }
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditedProfession(selectedContact.ai_profession || '');
    setEditedSector(selectedContact.ai_sector || '');
    setIsEditing(true);
  };

  const confidence = selectedContact.confidence || 0;
  const getConfidenceLevel = () => {
    if (confidence > 0.7) return { level: 'High', color: 'high' };
    if (confidence > 0.4) return { level: 'Medium', color: 'medium' };
    return { level: 'Low', color: 'low' };
  };

  const confidenceInfo = getConfidenceLevel();

  return (
    <div className="ai-profile-panel">
      {/* Contact Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          {selectedContact.name?.[0] || '?'}
        </div>
        <h2 className="profile-name">{selectedContact.name || 'Unknown'}</h2>
        {selectedContact.username && (
          <p className="profile-username">@{selectedContact.username}</p>
        )}
      </div>

      {/* AI Profile Section */}
      <div className="profile-section">
        <div className="section-header">
          <h3>AI Profile</h3>
          {!isEditing ? (
            <button className="edit-btn" onClick={handleStartEdit}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit
            </button>
          ) : (
            <div className="edit-actions">
              <button className="save-btn" onClick={handleSaveEdit}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8l4 4L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="profile-field">
          <label>Profession</label>
          {isEditing ? (
            <input
              type="text"
              value={editedProfession}
              onChange={(e) => setEditedProfession(e.target.value)}
              className="profile-input"
              placeholder="Enter profession"
            />
          ) : (
            <div className="profile-value">
              {selectedContact.ai_profession || 'Unknown'}
            </div>
          )}
        </div>

        <div className="profile-field">
          <label>Sector</label>
          {isEditing ? (
            <input
              type="text"
              value={editedSector}
              onChange={(e) => setEditedSector(e.target.value)}
              className="profile-input"
              placeholder="Enter sector"
            />
          ) : (
            <div className="profile-value">
              {selectedContact.ai_sector || 'Unknown'}
            </div>
          )}
        </div>

        <div className="profile-field">
          <label>Confidence</label>
          <div className="confidence-container">
            <div className="confidence-bar">
              <div
                className={`confidence-fill ${confidenceInfo.color}`}
                style={{ width: `${confidence * 100}%` }}
              ></div>
            </div>
            <span className={`confidence-label ${confidenceInfo.color}`}>
              {Math.round(confidence * 100)}% - {confidenceInfo.level}
            </span>
          </div>
        </div>
      </div>

      {/* Evidence Keywords */}
      {selectedContact.evidence_keywords && selectedContact.evidence_keywords.length > 0 && (
        <div className="profile-section">
          <h3>Evidence Keywords</h3>
          <div className="keywords-list">
            {selectedContact.evidence_keywords.map((keyword, index) => (
              <span key={index} className="keyword-tag">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Message Analysis */}
      <div className="profile-section">
        <h3>Message Analysis</h3>
        <div className="analysis-stats">
          <div className="stat-item">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Messages</div>
              <div className="stat-value">{selectedContact.message_count || 0}</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Last Activity</div>
              <div className="stat-value">
                {selectedContact.last_activity
                  ? new Date(selectedContact.last_activity).toLocaleDateString()
                  : 'Unknown'}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Engagement</div>
              <div className="stat-value">
                {selectedContact.engagement_score
                  ? `${Math.round(selectedContact.engagement_score * 100)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {selectedContact.ai_summary && (
        <div className="profile-section">
          <h3>AI Summary</h3>
          <div className="ai-summary">
            <div className="summary-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 12V8m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p>{selectedContact.ai_summary}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="profile-actions">
        <button className="action-btn primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17 10l-7 7-7-7M10 3v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Export Profile
        </button>
        <button className="action-btn secondary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4h12M4 10h12M4 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          View All Messages
        </button>
      </div>
    </div>
  );
};

export default AIProfilePanel;
