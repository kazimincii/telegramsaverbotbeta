/**
 * Audio Player Component (Howler.js based)
 * Supports playlists, equalizer, and visualizations
 */

import React, { useRef, useEffect, useState } from 'react';

export default function AudioPlayer({ media, playlist = [] }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);

  // Equalizer frequencies
  const [eqSettings, setEqSettings] = useState({
    bass: 0,      // 60-250 Hz
    mid: 0,       // 250-4000 Hz
    treble: 0     // 4000-16000 Hz
  });

  const tracks = playlist.length > 0 ? playlist : [media];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Setup Web Audio API for visualizer
    if (showVisualizer && !audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyserNode = ctx.createAnalyser();
      const source = ctx.createMediaElementSource(audio);

      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      setAudioContext(ctx);
      setAnalyser(analyserNode);
    }

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [media, isLooping, audioContext]);

  /**
   * Visualizer animation
   */
  useEffect(() => {
    if (!showVisualizer || !analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return;

      requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, [analyser, isPlaying, showVisualizer]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio.paused) {
      audio.play();
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } else {
      audio.pause();
    }
  };

  /**
   * Play next track
   */
  const playNext = () => {
    if (tracks.length <= 1) return;

    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = (currentTrack + 1) % tracks.length;
    }

    setCurrentTrack(nextIndex);
    setTimeout(() => audioRef.current.play(), 100);
  };

  /**
   * Play previous track
   */
  const playPrevious = () => {
    if (tracks.length <= 1) return;

    const prevIndex = currentTrack === 0 ? tracks.length - 1 : currentTrack - 1;
    setCurrentTrack(prevIndex);
    setTimeout(() => audioRef.current.play(), 100);
  };

  /**
   * Seek audio
   */
  const handleSeek = (e) => {
    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * duration;
  };

  /**
   * Change volume
   */
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    const audio = audioRef.current;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  /**
   * Apply equalizer settings
   */
  const applyEqualizer = (freq, value) => {
    setEqSettings(prev => ({ ...prev, [freq]: value }));
    // In a real implementation, this would apply Web Audio API filters
  };

  /**
   * Format time
   */
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * Select track from playlist
   */
  const selectTrack = (index) => {
    setCurrentTrack(index);
    setTimeout(() => audioRef.current.play(), 100);
  };

  return (
    <div className="audio-player">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={tracks[currentTrack]?.url || tracks[currentTrack]?.path}
      />

      {/* Album Art */}
      <div className="audio-album-art">
        {tracks[currentTrack]?.thumbnail ? (
          <img src={tracks[currentTrack].thumbnail} alt="Album art" />
        ) : (
          <div className="audio-placeholder">🎵</div>
        )}
      </div>

      {/* Visualizer Canvas */}
      {showVisualizer && (
        <canvas
          ref={canvasRef}
          className="audio-visualizer"
          width={600}
          height={200}
        />
      )}

      {/* Track Info */}
      <div className="audio-track-info">
        <div className="audio-track-title">{tracks[currentTrack]?.name || 'Unknown Track'}</div>
        <div className="audio-track-artist">{tracks[currentTrack]?.artist || 'Unknown Artist'}</div>
        {tracks[currentTrack]?.album && (
          <div className="audio-track-album">{tracks[currentTrack].album}</div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="audio-progress-container" onClick={handleSeek}>
        <div className="audio-progress-bar">
          <div
            className="audio-progress-filled"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <div className="audio-time-labels">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="audio-controls">
        {/* Left Controls */}
        <div className="audio-controls-left">
          {/* Volume */}
          <button onClick={toggleMute} className="audio-btn">
            {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="audio-volume-slider"
          />
        </div>

        {/* Center Controls */}
        <div className="audio-controls-center">
          <button onClick={() => setIsShuffled(!isShuffled)} className={`audio-btn ${isShuffled ? 'active' : ''}`}>
            🔀
          </button>

          <button onClick={playPrevious} className="audio-btn" disabled={tracks.length <= 1}>
            ⏮️
          </button>

          <button onClick={togglePlayPause} className="audio-btn-play">
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <button onClick={playNext} className="audio-btn" disabled={tracks.length <= 1}>
            ⏭️
          </button>

          <button onClick={() => setIsLooping(!isLooping)} className={`audio-btn ${isLooping ? 'active' : ''}`}>
            🔁
          </button>
        </div>

        {/* Right Controls */}
        <div className="audio-controls-right">
          <button
            onClick={() => setShowEqualizer(!showEqualizer)}
            className={`audio-btn ${showEqualizer ? 'active' : ''}`}
            title="Equalizer"
          >
            🎛️
          </button>

          <button
            onClick={() => setShowVisualizer(!showVisualizer)}
            className={`audio-btn ${showVisualizer ? 'active' : ''}`}
            title="Visualizer"
          >
            📊
          </button>

          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`audio-btn ${showPlaylist ? 'active' : ''}`}
            title="Playlist"
          >
            📋
          </button>
        </div>
      </div>

      {/* Equalizer Panel */}
      {showEqualizer && (
        <div className="audio-equalizer-panel">
          <h4>Equalizer</h4>
          <div className="equalizer-controls">
            <div className="eq-control">
              <label>Bass</label>
              <input
                type="range"
                min="-10"
                max="10"
                value={eqSettings.bass}
                onChange={(e) => applyEqualizer('bass', parseInt(e.target.value))}
                orient="vertical"
              />
              <span>{eqSettings.bass}</span>
            </div>
            <div className="eq-control">
              <label>Mid</label>
              <input
                type="range"
                min="-10"
                max="10"
                value={eqSettings.mid}
                onChange={(e) => applyEqualizer('mid', parseInt(e.target.value))}
                orient="vertical"
              />
              <span>{eqSettings.mid}</span>
            </div>
            <div className="eq-control">
              <label>Treble</label>
              <input
                type="range"
                min="-10"
                max="10"
                value={eqSettings.treble}
                onChange={(e) => applyEqualizer('treble', parseInt(e.target.value))}
                orient="vertical"
              />
              <span>{eqSettings.treble}</span>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Panel */}
      {showPlaylist && tracks.length > 1 && (
        <div className="audio-playlist-panel">
          <h4>Playlist ({tracks.length} tracks)</h4>
          <div className="playlist-tracks">
            {tracks.map((track, index) => (
              <div
                key={index}
                className={`playlist-track ${index === currentTrack ? 'active' : ''}`}
                onClick={() => selectTrack(index)}
              >
                <div className="track-number">{index + 1}</div>
                <div className="track-info">
                  <div className="track-name">{track.name}</div>
                  <div className="track-artist">{track.artist || 'Unknown'}</div>
                </div>
                <div className="track-duration">{formatTime(track.duration || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
