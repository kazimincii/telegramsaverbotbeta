/**
 * Universal Media Player Component
 * Supports video, audio, images, and documents with preview
 */

import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import ImageGallery from './ImageGallery';
import DocumentViewer from './DocumentViewer';
import './MediaPlayer.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function MediaPlayer() {
  const [activeTab, setActiveTab] = useState('video');
  const [mediaFiles, setMediaFiles] = useState({
    videos: [],
    audio: [],
    images: [],
    documents: []
  });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadMediaFiles();
  }, []);

  /**
   * Load media files from backend
   */
  const loadMediaFiles = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/media/list`);
      const data = await response.json();

      if (data.success) {
        setMediaFiles({
          videos: data.media.filter(m => m.type === 'video'),
          audio: data.media.filter(m => m.type === 'audio'),
          images: data.media.filter(m => m.type === 'image'),
          documents: data.media.filter(m => m.type === 'document')
        });
      }
    } catch (error) {
      console.error('Failed to load media files:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle media selection
   */
  const handleMediaSelect = (media) => {
    setSelectedMedia(media);
    setPreviewMode(true);
  };

  /**
   * Close preview
   */
  const closePreview = () => {
    setPreviewMode(false);
    setSelectedMedia(null);
  };

  /**
   * Render media grid
   */
  const renderMediaGrid = (mediaList, type) => {
    if (mediaList.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            {type === 'video' && '🎬'}
            {type === 'audio' && '🎵'}
            {type === 'images' && '🖼️'}
            {type === 'documents' && '📄'}
          </div>
          <div className="empty-text">
            No {type} files found
          </div>
        </div>
      );
    }

    return (
      <div className="media-grid">
        {mediaList.map((media, index) => (
          <div
            key={media.id || index}
            className="media-card"
            onClick={() => handleMediaSelect(media)}
          >
            <div className="media-thumbnail">
              {media.thumbnail ? (
                <img src={media.thumbnail} alt={media.name} />
              ) : (
                <div className="media-placeholder">
                  {type === 'video' && '🎬'}
                  {type === 'audio' && '🎵'}
                  {type === 'images' && '🖼️'}
                  {type === 'documents' && '📄'}
                </div>
              )}
              {media.duration && (
                <div className="media-duration">{formatDuration(media.duration)}</div>
              )}
            </div>
            <div className="media-info">
              <div className="media-name" title={media.name}>{media.name}</div>
              <div className="media-meta">
                <span>{formatFileSize(media.size)}</span>
                {media.resolution && <span>{media.resolution}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="media-player-container">
      {/* Preview Modal */}
      {previewMode && selectedMedia && (
        <div className="media-preview-modal" onClick={closePreview}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePreview}>×</button>

            {selectedMedia.type === 'video' && (
              <VideoPlayer media={selectedMedia} />
            )}

            {selectedMedia.type === 'audio' && (
              <AudioPlayer media={selectedMedia} />
            )}

            {selectedMedia.type === 'image' && (
              <ImageGallery
                images={mediaFiles.images}
                startIndex={mediaFiles.images.findIndex(img => img.id === selectedMedia.id)}
                onClose={closePreview}
              />
            )}

            {selectedMedia.type === 'document' && (
              <DocumentViewer document={selectedMedia} />
            )}
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">🎬 Media Preview & Player</h3>
            <div className="card-description">
              Play videos, audio, view images and documents with built-in preview
            </div>
          </div>
          <div className="media-stats">
            <div className="stat">
              <span className="stat-icon">🎬</span>
              <span className="stat-value">{mediaFiles.videos.length}</span>
            </div>
            <div className="stat">
              <span className="stat-icon">🎵</span>
              <span className="stat-value">{mediaFiles.audio.length}</span>
            </div>
            <div className="stat">
              <span className="stat-icon">🖼️</span>
              <span className="stat-value">{mediaFiles.images.length}</span>
            </div>
            <div className="stat">
              <span className="stat-icon">📄</span>
              <span className="stat-value">{mediaFiles.documents.length}</span>
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => setActiveTab('video')}
            >
              🎬 Videos ({mediaFiles.videos.length})
            </button>
            <button
              className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
            >
              🎵 Audio ({mediaFiles.audio.length})
            </button>
            <button
              className={`tab ${activeTab === 'images' ? 'active' : ''}`}
              onClick={() => setActiveTab('images')}
            >
              🖼️ Images ({mediaFiles.images.length})
            </button>
            <button
              className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              📄 Documents ({mediaFiles.documents.length})
            </button>
          </div>

          {/* Content */}
          <div className="media-content">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading media files...</div>
              </div>
            ) : (
              <>
                {activeTab === 'video' && renderMediaGrid(mediaFiles.videos, 'video')}
                {activeTab === 'audio' && renderMediaGrid(mediaFiles.audio, 'audio')}
                {activeTab === 'images' && renderMediaGrid(mediaFiles.images, 'images')}
                {activeTab === 'documents' && renderMediaGrid(mediaFiles.documents, 'documents')}
              </>
            )}
          </div>
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> Click on any media to preview it without downloading
          </div>
        </div>
      </div>
    </div>
  );
}
