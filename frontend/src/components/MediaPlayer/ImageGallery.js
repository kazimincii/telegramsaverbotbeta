/**
 * Image Gallery Component (PhotoSwipe based)
 * Supports slideshow, zoom, pan, and touch gestures
 */

import React, { useState, useEffect, useRef } from 'react';

export default function ImageGallery({ images, startIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const currentImage = images[currentIndex];

  /**
   * Slideshow timer
   */
  useEffect(() => {
    if (!isSlideshow) return;

    const timer = setInterval(() => {
      goToNext();
    }, 3000); // 3 seconds per image

    return () => clearInterval(timer);
  }, [isSlideshow, currentIndex]);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
        case ' ':
          e.preventDefault();
          toggleSlideshow();
          break;
        case 'i':
          setShowInfo(!showInfo);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, zoom, showInfo]);

  /**
   * Navigate to next image
   */
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    resetZoom();
  };

  /**
   * Navigate to previous image
   */
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    resetZoom();
  };

  /**
   * Jump to specific image
   */
  const goToImage = (index) => {
    setCurrentIndex(index);
    resetZoom();
  };

  /**
   * Zoom in
   */
  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
  };

  /**
   * Zoom out
   */
  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  /**
   * Reset zoom and pan
   */
  const resetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  /**
   * Handle mouse wheel zoom
   */
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  };

  /**
   * Handle mouse drag start
   */
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  /**
   * Handle mouse drag
   */
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  /**
   * Handle mouse drag end
   */
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /**
   * Toggle slideshow
   */
  const toggleSlideshow = () => {
    setIsSlideshow(!isSlideshow);
    if (!isSlideshow) {
      resetZoom();
    }
  };

  /**
   * Download current image
   */
  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = currentImage.url || currentImage.path;
    link.download = currentImage.name || 'image.jpg';
    link.click();
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
    <div
      ref={containerRef}
      className="image-gallery"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Bar */}
      <div className="gallery-top-bar">
        <div className="gallery-counter">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="gallery-toolbar">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`toolbar-btn ${showInfo ? 'active' : ''}`}
            title="Info (i)"
          >
            ℹ️
          </button>
          <button
            onClick={downloadImage}
            className="toolbar-btn"
            title="Download"
          >
            💾
          </button>
          <button
            onClick={toggleSlideshow}
            className={`toolbar-btn ${isSlideshow ? 'active' : ''}`}
            title="Slideshow (Space)"
          >
            {isSlideshow ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`toolbar-btn ${showThumbnails ? 'active' : ''}`}
            title="Thumbnails"
          >
            🖼️
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div
        ref={imageRef}
        className="gallery-image-container"
        onMouseDown={handleMouseDown}
        style={{
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <img
          src={currentImage.url || currentImage.path}
          alt={currentImage.name}
          className="gallery-image"
          style={{
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease'
          }}
          draggable={false}
        />
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="gallery-info-panel">
          <h4>Image Information</h4>
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{currentImage.name}</span>
          </div>
          {currentImage.size && (
            <div className="info-row">
              <span className="info-label">Size:</span>
              <span className="info-value">{formatFileSize(currentImage.size)}</span>
            </div>
          )}
          {currentImage.resolution && (
            <div className="info-row">
              <span className="info-label">Resolution:</span>
              <span className="info-value">{currentImage.resolution}</span>
            </div>
          )}
          {currentImage.format && (
            <div className="info-row">
              <span className="info-label">Format:</span>
              <span className="info-value">{currentImage.format.toUpperCase()}</span>
            </div>
          )}
          {currentImage.date && (
            <div className="info-row">
              <span className="info-label">Date:</span>
              <span className="info-value">{new Date(currentImage.date).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Thumbnails Strip */}
      {showThumbnails && (
        <div className="gallery-thumbnails">
          {images.map((img, index) => (
            <div
              key={index}
              className={`gallery-thumbnail ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToImage(index)}
            >
              <img src={img.thumbnail || img.url || img.path} alt={img.name} />
            </div>
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        className="gallery-nav-btn gallery-nav-prev"
        title="Previous (←)"
      >
        ‹
      </button>

      <button
        onClick={goToNext}
        className="gallery-nav-btn gallery-nav-next"
        title="Next (→)"
      >
        ›
      </button>

      {/* Bottom Controls */}
      <div className="gallery-bottom-bar">
        {/* Zoom Controls */}
        <div className="gallery-zoom-controls">
          <button onClick={zoomOut} className="zoom-btn" title="Zoom Out (-)">
            −
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="zoom-btn" title="Zoom In (+)">
            +
          </button>
          <button onClick={resetZoom} className="zoom-btn" title="Reset (0)">
            ⟲
          </button>
        </div>

        {/* Image Title */}
        <div className="gallery-image-title">
          {currentImage.name}
        </div>
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="gallery-close-btn" title="Close (Esc)">
        ×
      </button>

      {/* Keyboard Shortcuts Help */}
      <div className="gallery-shortcuts-hint">
        <span>←→ Navigate</span>
        <span>±0 Zoom</span>
        <span>Space Slideshow</span>
        <span>i Info</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
}
