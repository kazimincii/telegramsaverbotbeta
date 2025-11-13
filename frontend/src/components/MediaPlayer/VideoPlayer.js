/**
 * Video Player Component (Video.js based)
 * Supports h264, h265, VP9, AV1 codecs with subtitles
 */

import React, { useRef, useEffect, useState } from 'react';

export default function VideoPlayer({ media, onClose }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [subtitles, setSubtitles] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Load video metadata
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    // Update current time
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    // Handle play/pause
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Load subtitles if available
    if (media.subtitles) {
      setSubtitles(media.subtitles);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [media]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  /**
   * Seek video
   */
  const handleSeek = (e) => {
    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  /**
   * Change volume
   */
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = () => {
    const container = videoRef.current.parentElement;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /**
   * Change playback rate
   */
  const changePlaybackRate = (rate) => {
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  /**
   * Skip forward/backward
   */
  const skip = (seconds) => {
    videoRef.current.currentTime += seconds;
  };

  /**
   * Load subtitle track
   */
  const loadSubtitle = (subtitle) => {
    setActiveSubtitle(subtitle);
    // In a real implementation, this would add a <track> element
  };

  /**
   * Format time
   */
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          skip(-5);
          break;
        case 'ArrowRight':
          skip(5);
          break;
        case 'ArrowUp':
          setVolume(Math.min(1, volume + 0.1));
          videoRef.current.volume = Math.min(1, volume + 0.1);
          break;
        case 'ArrowDown':
          setVolume(Math.max(0, volume - 0.1));
          videoRef.current.volume = Math.max(0, volume - 0.1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume]);

  return (
    <div
      className="video-player"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="video-element"
        src={media.url || media.path}
        poster={media.thumbnail}
        onDoubleClick={toggleFullscreen}
      />

      {/* Controls Overlay */}
      <div className={`video-controls ${showControls ? 'visible' : ''}`}>
        {/* Top Bar - Title and Info */}
        <div className="video-top-bar">
          <div className="video-title">{media.name}</div>
          <div className="video-info">
            {media.resolution && <span>{media.resolution}</span>}
            {media.codec && <span>{media.codec}</span>}
            {media.size && <span>{formatFileSize(media.size)}</span>}
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && (
          <div className="video-play-button" onClick={togglePlayPause}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="video-bottom-controls">
          {/* Progress Bar */}
          <div className="video-progress-container" onClick={handleSeek}>
            <div className="video-progress-bar">
              <div
                className="video-progress-filled"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="video-control-buttons">
            <div className="video-controls-left">
              {/* Play/Pause */}
              <button onClick={togglePlayPause} className="control-btn">
                {isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Skip Backward */}
              <button onClick={() => skip(-10)} className="control-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
                <span className="skip-text">10</span>
              </button>

              {/* Skip Forward */}
              <button onClick={() => skip(10)} className="control-btn">
                <span className="skip-text">10</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                </svg>
              </button>

              {/* Volume */}
              <div className="volume-control">
                <button onClick={toggleMute} className="control-btn">
                  {isMuted || volume === 0 ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>

              {/* Time */}
              <div className="video-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="video-controls-right">
              {/* Playback Speed */}
              <div className="playback-speed">
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="speed-select"
                >
                  <option value="0.25">0.25x</option>
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>

              {/* Subtitles */}
              {subtitles.length > 0 && (
                <div className="subtitles-menu">
                  <button className="control-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="control-btn">
                {isFullscreen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
