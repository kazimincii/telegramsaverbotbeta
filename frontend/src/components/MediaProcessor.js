import React, { useState, useEffect, useRef } from 'react';
import './MediaProcessor.css';

const MediaProcessor = () => {
  const [activeTab, setActiveTab] = useState('video');
  const [videoProfiles, setVideoProfiles] = useState([]);
  const [audioProfiles, setAudioProfiles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchQueue, setBatchQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Video transcoding state
  const [videoSettings, setVideoSettings] = useState({
    profileId: '',
    outputFormat: 'mp4',
    customSettings: {
      codec: '',
      resolution: '',
      bitrate: '',
      fps: ''
    }
  });

  // Image optimization state
  const [imageSettings, setImageSettings] = useState({
    format: 'jpeg',
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    progressive: true,
    stripMetadata: false
  });

  // Audio conversion state
  const [audioSettings, setAudioSettings] = useState({
    profileId: '',
    format: 'mp3',
    bitrate: '192',
    sampleRate: '44100',
    channels: '2'
  });

  // Batch processing state
  const [batchSettings, setBatchSettings] = useState({
    mediaType: 'video',
    concurrency: 2,
    priority: 'normal'
  });

  // Load profiles on mount
  useEffect(() => {
    loadVideoProfiles();
    loadAudioProfiles();
    loadStats();
    const interval = setInterval(() => {
      loadJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadVideoProfiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/media/video/profiles');
      if (response.ok) {
        const data = await response.json();
        setVideoProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to load video profiles:', error);
    }
  };

  const loadAudioProfiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/media/audio/profiles');
      if (response.ok) {
        const data = await response.json();
        setAudioProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to load audio profiles:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/media/jobs?user_id=test_user');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/media/stats?user_id=test_user');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleVideoTranscode = async () => {
    if (!selectedFiles.length) {
      alert('Lütfen dosya seçin');
      return;
    }

    setLoading(true);
    try {
      for (const file of selectedFiles) {
        const response = await fetch('http://localhost:8000/api/media/video/transcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_file: file.name,
            profile_id: videoSettings.profileId,
            user_id: 'test_user',
            output_format: videoSettings.outputFormat,
            custom_settings: videoSettings.customSettings.codec ? videoSettings.customSettings : undefined
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Video transcoding started:', data);
        }
      }

      alert(`${selectedFiles.length} video dönüştürme işlemi başlatıldı`);
      setSelectedFiles([]);
      loadJobs();
    } catch (error) {
      console.error('Video transcoding failed:', error);
      alert('Video dönüştürme başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageOptimize = async () => {
    if (!selectedFiles.length) {
      alert('Lütfen dosya seçin');
      return;
    }

    setLoading(true);
    try {
      for (const file of selectedFiles) {
        const response = await fetch('http://localhost:8000/api/media/image/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_file: file.name,
            user_id: 'test_user',
            ...imageSettings
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Image optimization started:', data);
        }
      }

      alert(`${selectedFiles.length} görsel optimizasyon işlemi başlatıldı`);
      setSelectedFiles([]);
      loadJobs();
    } catch (error) {
      console.error('Image optimization failed:', error);
      alert('Görsel optimizasyon başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleAudioConvert = async () => {
    if (!selectedFiles.length) {
      alert('Lütfen dosya seçin');
      return;
    }

    setLoading(true);
    try {
      for (const file of selectedFiles) {
        const response = await fetch('http://localhost:8000/api/media/audio/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_file: file.name,
            profile_id: audioSettings.profileId || undefined,
            user_id: 'test_user',
            format: audioSettings.format,
            bitrate: parseInt(audioSettings.bitrate),
            sample_rate: parseInt(audioSettings.sampleRate),
            channels: parseInt(audioSettings.channels)
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Audio conversion started:', data);
        }
      }

      alert(`${selectedFiles.length} ses dönüştürme işlemi başlatıldı`);
      setSelectedFiles([]);
      loadJobs();
    } catch (error) {
      console.error('Audio conversion failed:', error);
      alert('Ses dönüştürme başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchProcess = async () => {
    if (!batchQueue.length) {
      alert('Lütfen batch kuyruğuna dosya ekleyin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/media/batch/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: batchQueue.map(f => f.name),
          media_type: batchSettings.mediaType,
          user_id: 'test_user',
          settings: {},
          concurrency: batchSettings.concurrency,
          priority: batchSettings.priority
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Batch işlem başlatıldı: ${data.batch_id}`);
        setBatchQueue([]);
        loadJobs();
      }
    } catch (error) {
      console.error('Batch processing failed:', error);
      alert('Batch işlem başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const addToBatch = () => {
    if (selectedFiles.length) {
      setBatchQueue([...batchQueue, ...selectedFiles]);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFromBatch = (index) => {
    setBatchQueue(batchQueue.filter((_, i) => i !== index));
  };

  const cancelJob = async (jobId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/media/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test_user' })
      });

      if (response.ok) {
        alert('İşlem iptal edildi');
        loadJobs();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const retryJob = async (jobId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/media/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'test_user' })
      });

      if (response.ok) {
        alert('İşlem yeniden başlatıldı');
        loadJobs();
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#f59e0b';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⚙️';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '⏳';
    }
  };

  return (
    <div className="media-processor-container">
      <div className="media-processor-header">
        <h1 className="media-processor-title">🎬 Gelişmiş Medya İşleme</h1>
        <p className="media-processor-subtitle">Video, görsel ve ses dosyalarını işleyin ve optimize edin</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total_jobs || 0}</div>
              <div className="stat-label">Toplam İşlem</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.completed_jobs || 0}</div>
              <div className="stat-label">Tamamlanan</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚙️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.processing_jobs || 0}</div>
              <div className="stat-label">İşlemde</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{stats.failed_jobs || 0}</div>
              <div className="stat-label">Başarısız</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="media-tabs">
        <button
          className={`media-tab ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          🎥 Video Dönüştürme
        </button>
        <button
          className={`media-tab ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          🖼️ Görsel Optimizasyon
        </button>
        <button
          className={`media-tab ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          🎵 Ses Dönüştürme
        </button>
        <button
          className={`media-tab ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          📦 Toplu İşlem
        </button>
        <button
          className={`media-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          📋 İşlem Geçmişi ({jobs.length})
        </button>
      </div>

      {/* Video Transcoding Tab */}
      {activeTab === 'video' && (
        <div className="tab-content">
          <h2>Video Dönüştürme</h2>

          <div className="form-section">
            <label className="form-label">Dosya Seçin</label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="video/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <span key={index} className="file-tag">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Profil Seçin</label>
            <select
              value={videoSettings.profileId}
              onChange={(e) => setVideoSettings({...videoSettings, profileId: e.target.value})}
              className="form-select"
            >
              <option value="">-- Profil Seçin --</option>
              {videoProfiles.map(profile => (
                <option key={profile.profile_id} value={profile.profile_id}>
                  {profile.name} - {profile.resolution} ({profile.codec})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Çıkış Formatı</label>
              <select
                value={videoSettings.outputFormat}
                onChange={(e) => setVideoSettings({...videoSettings, outputFormat: e.target.value})}
                className="form-select"
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="mkv">MKV</option>
                <option value="avi">AVI</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Özel Ayarlar (Opsiyonel)</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Codec</label>
                <input
                  type="text"
                  placeholder="h264, h265, vp9..."
                  value={videoSettings.customSettings.codec}
                  onChange={(e) => setVideoSettings({
                    ...videoSettings,
                    customSettings: {...videoSettings.customSettings, codec: e.target.value}
                  })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Çözünürlük</label>
                <input
                  type="text"
                  placeholder="1920x1080"
                  value={videoSettings.customSettings.resolution}
                  onChange={(e) => setVideoSettings({
                    ...videoSettings,
                    customSettings: {...videoSettings.customSettings, resolution: e.target.value}
                  })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bitrate (kbps)</label>
                <input
                  type="text"
                  placeholder="5000"
                  value={videoSettings.customSettings.bitrate}
                  onChange={(e) => setVideoSettings({
                    ...videoSettings,
                    customSettings: {...videoSettings.customSettings, bitrate: e.target.value}
                  })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">FPS</label>
                <input
                  type="text"
                  placeholder="30"
                  value={videoSettings.customSettings.fps}
                  onChange={(e) => setVideoSettings({
                    ...videoSettings,
                    customSettings: {...videoSettings.customSettings, fps: e.target.value}
                  })}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleVideoTranscode}
            disabled={loading || !selectedFiles.length}
          >
            {loading ? '⏳ İşleniyor...' : '🎬 Video Dönüştürmeyi Başlat'}
          </button>
        </div>
      )}

      {/* Image Optimization Tab */}
      {activeTab === 'image' && (
        <div className="tab-content">
          <h2>Görsel Optimizasyon</h2>

          <div className="form-section">
            <label className="form-label">Dosya Seçin</label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <span key={index} className="file-tag">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Format</label>
              <select
                value={imageSettings.format}
                onChange={(e) => setImageSettings({...imageSettings, format: e.target.value})}
                className="form-select"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kalite: {imageSettings.quality}%</label>
              <input
                type="range"
                min="1"
                max="100"
                value={imageSettings.quality}
                onChange={(e) => setImageSettings({...imageSettings, quality: parseInt(e.target.value)})}
                className="form-range"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Maksimum Genişlik (px)</label>
              <input
                type="number"
                value={imageSettings.maxWidth}
                onChange={(e) => setImageSettings({...imageSettings, maxWidth: parseInt(e.target.value)})}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Maksimum Yükseklik (px)</label>
              <input
                type="number"
                value={imageSettings.maxHeight}
                onChange={(e) => setImageSettings({...imageSettings, maxHeight: parseInt(e.target.value)})}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={imageSettings.progressive}
                onChange={(e) => setImageSettings({...imageSettings, progressive: e.target.checked})}
              />
              <span>Progressive Encoding</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={imageSettings.stripMetadata}
                onChange={(e) => setImageSettings({...imageSettings, stripMetadata: e.target.checked})}
              />
              <span>Metadata Kaldır (EXIF, IPTC)</span>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={handleImageOptimize}
            disabled={loading || !selectedFiles.length}
          >
            {loading ? '⏳ İşleniyor...' : '🖼️ Görsel Optimizasyonu Başlat'}
          </button>
        </div>
      )}

      {/* Audio Conversion Tab */}
      {activeTab === 'audio' && (
        <div className="tab-content">
          <h2>Ses Dönüştürme</h2>

          <div className="form-section">
            <label className="form-label">Dosya Seçin</label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="audio/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <span key={index} className="file-tag">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Profil Seçin (Opsiyonel)</label>
            <select
              value={audioSettings.profileId}
              onChange={(e) => setAudioSettings({...audioSettings, profileId: e.target.value})}
              className="form-select"
            >
              <option value="">-- Manuel Ayarlar --</option>
              {audioProfiles.map(profile => (
                <option key={profile.profile_id} value={profile.profile_id}>
                  {profile.name} - {profile.format} ({profile.bitrate_kbps} kbps)
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Format</label>
              <select
                value={audioSettings.format}
                onChange={(e) => setAudioSettings({...audioSettings, format: e.target.value})}
                className="form-select"
              >
                <option value="mp3">MP3</option>
                <option value="aac">AAC</option>
                <option value="ogg">OGG</option>
                <option value="flac">FLAC</option>
                <option value="wav">WAV</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bitrate (kbps)</label>
              <select
                value={audioSettings.bitrate}
                onChange={(e) => setAudioSettings({...audioSettings, bitrate: e.target.value})}
                className="form-select"
              >
                <option value="64">64 kbps</option>
                <option value="128">128 kbps</option>
                <option value="192">192 kbps</option>
                <option value="256">256 kbps</option>
                <option value="320">320 kbps</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sample Rate (Hz)</label>
              <select
                value={audioSettings.sampleRate}
                onChange={(e) => setAudioSettings({...audioSettings, sampleRate: e.target.value})}
                className="form-select"
              >
                <option value="22050">22050 Hz</option>
                <option value="44100">44100 Hz</option>
                <option value="48000">48000 Hz</option>
                <option value="96000">96000 Hz</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kanallar</label>
              <select
                value={audioSettings.channels}
                onChange={(e) => setAudioSettings({...audioSettings, channels: e.target.value})}
                className="form-select"
              >
                <option value="1">Mono</option>
                <option value="2">Stereo</option>
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleAudioConvert}
            disabled={loading || !selectedFiles.length}
          >
            {loading ? '⏳ İşleniyor...' : '🎵 Ses Dönüştürmeyi Başlat'}
          </button>
        </div>
      )}

      {/* Batch Processing Tab */}
      {activeTab === 'batch' && (
        <div className="tab-content">
          <h2>Toplu İşlem</h2>

          <div className="form-section">
            <label className="form-label">Dosya Ekle</label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="file-input"
            />
            {selectedFiles.length > 0 && (
              <button className="btn-secondary" onClick={addToBatch} style={{marginTop: '10px'}}>
                ➕ Kuyruğa Ekle ({selectedFiles.length} dosya)
              </button>
            )}
          </div>

          <div className="batch-queue">
            <h3>Kuyruk ({batchQueue.length} dosya)</h3>
            {batchQueue.length === 0 ? (
              <div className="empty-state">
                <p>Henüz dosya eklenmedi</p>
              </div>
            ) : (
              <div className="queue-list">
                {batchQueue.map((file, index) => (
                  <div key={index} className="queue-item">
                    <span className="queue-file-name">{file.name}</span>
                    <button
                      className="btn-remove"
                      onClick={() => removeFromBatch(index)}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Medya Tipi</label>
              <select
                value={batchSettings.mediaType}
                onChange={(e) => setBatchSettings({...batchSettings, mediaType: e.target.value})}
                className="form-select"
              >
                <option value="video">Video</option>
                <option value="image">Görsel</option>
                <option value="audio">Ses</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Eşzamanlı İşlem</label>
              <select
                value={batchSettings.concurrency}
                onChange={(e) => setBatchSettings({...batchSettings, concurrency: parseInt(e.target.value)})}
                className="form-select"
              >
                <option value="1">1 dosya</option>
                <option value="2">2 dosya</option>
                <option value="3">3 dosya</option>
                <option value="4">4 dosya</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Öncelik</label>
              <select
                value={batchSettings.priority}
                onChange={(e) => setBatchSettings({...batchSettings, priority: e.target.value})}
                className="form-select"
              >
                <option value="low">Düşük</option>
                <option value="normal">Normal</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleBatchProcess}
            disabled={loading || !batchQueue.length}
          >
            {loading ? '⏳ İşleniyor...' : `📦 Toplu İşlemi Başlat (${batchQueue.length} dosya)`}
          </button>
        </div>
      )}

      {/* Jobs History Tab */}
      {activeTab === 'jobs' && (
        <div className="tab-content">
          <h2>İşlem Geçmişi</h2>

          {jobs.length === 0 ? (
            <div className="empty-state">
              <p>Henüz işlem kaydı yok</p>
            </div>
          ) : (
            <div className="jobs-list">
              {jobs.map(job => (
                <div key={job.job_id} className="job-card">
                  <div className="job-header">
                    <div className="job-info">
                      <span className="job-icon">{getStatusIcon(job.status)}</span>
                      <div>
                        <div className="job-file">{job.input_file}</div>
                        <div className="job-meta">
                          {job.media_type.toUpperCase()} • {new Date(job.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    <div
                      className="job-status"
                      style={{ backgroundColor: getStatusColor(job.status) }}
                    >
                      {job.status}
                    </div>
                  </div>

                  {job.status === 'processing' && (
                    <div className="job-progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${job.progress || 0}%` }}
                      />
                      <span className="progress-text">{job.progress || 0}%</span>
                    </div>
                  )}

                  {job.settings && Object.keys(job.settings).length > 0 && (
                    <div className="job-settings">
                      <strong>Ayarlar:</strong>{' '}
                      {Object.entries(job.settings).map(([key, value]) => (
                        <span key={key} className="setting-tag">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="job-actions">
                    {job.status === 'processing' && (
                      <button
                        className="btn-action btn-cancel"
                        onClick={() => cancelJob(job.job_id)}
                      >
                        🚫 İptal Et
                      </button>
                    )}
                    {job.status === 'failed' && (
                      <button
                        className="btn-action btn-retry"
                        onClick={() => retryJob(job.job_id)}
                      >
                        🔄 Yeniden Dene
                      </button>
                    )}
                    {job.status === 'completed' && job.output_file && (
                      <button className="btn-action btn-download">
                        ⬇️ İndir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaProcessor;
