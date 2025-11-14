import React, { useState, useEffect } from 'react';
import './OCRProcessor.css';

const API_BASE = 'http://localhost:8000';

// Supported languages
const LANGUAGES = [
  { value: 'eng', label: 'English', flag: '🇬🇧' },
  { value: 'tur', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'deu', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'fra', label: 'Français', flag: '🇫🇷' },
  { value: 'spa', label: 'Español', flag: '🇪🇸' },
  { value: 'rus', label: 'Русский', flag: '🇷🇺' },
  { value: 'ara', label: 'العربية', flag: '🇸🇦' },
  { value: 'chi_sim', label: '中文', flag: '🇨🇳' },
  { value: 'jpn', label: '日本語', flag: '🇯🇵' },
  { value: 'kor', label: '한국어', flag: '🇰🇷' }
];

const OCRProcessor = () => {
  // State management
  const [activeTab, setActiveTab] = useState('process'); // process, results, statistics
  const [results, setResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Processing state
  const [filePath, setFilePath] = useState('');
  const [language, setLanguage] = useState('eng');
  const [batchFiles, setBatchFiles] = useState(['']);
  const [isScanned, setIsScanned] = useState(false);
  const [processingResult, setProcessingResult] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Load data on mount
  useEffect(() => {
    loadResults();
    loadStatistics();
  }, []);

  const loadResults = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ocr/results?limit=100`);
      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ocr/statistics`);
      const data = await response.json();

      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleProcessDocument = async () => {
    if (!filePath.trim()) {
      alert('Lütfen bir dosya yolu girin');
      return;
    }

    setLoading(true);
    setProcessingResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/ocr/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          language: language,
          options: { is_scanned: isScanned }
        })
      });

      const data = await response.json();

      if (data.success) {
        setProcessingResult(data.result);
        await loadResults();
        await loadStatistics();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to process document:', error);
      alert('Belge işlenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchProcess = async () => {
    const validFiles = batchFiles.filter(f => f.trim());

    if (validFiles.length === 0) {
      alert('Lütfen en az bir dosya yolu girin');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ocr/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_paths: validFiles,
          language: language,
          options: { is_scanned: isScanned }
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Başarılı: ${data.processed} belge işlendi, ${data.failed} başarısız`);
        await loadResults();
        await loadStatistics();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to batch process:', error);
      alert('Toplu işlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/ocr/search?query=${encodeURIComponent(searchQuery)}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.matches);
      }
    } catch (error) {
      console.error('Failed to search:', error);
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (!window.confirm('Bu sonucu silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/ocr/result/${resultId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await loadResults();
        await loadStatistics();
      }
    } catch (error) {
      console.error('Failed to delete result:', error);
    }
  };

  const addBatchFile = () => {
    setBatchFiles([...batchFiles, '']);
  };

  const removeBatchFile = (index) => {
    setBatchFiles(batchFiles.filter((_, i) => i !== index));
  };

  const updateBatchFile = (index, value) => {
    const newFiles = [...batchFiles];
    newFiles[index] = value;
    setBatchFiles(newFiles);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('tr-TR');
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return '#4caf50';
    if (confidence >= 0.7) return '#ff9800';
    return '#f44336';
  };

  // Render process tab
  const renderProcess = () => (
    <div className="process-section">
      <div className="section-header">
        <h3>Belge İşleme</h3>
      </div>

      <div className="process-modes">
        <div className="mode-card">
          <h4>📄 Tekli Belge İşleme</h4>

          <div className="form-group">
            <label>Dosya Yolu *</label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/path/to/document.pdf"
            />
          </div>

          <div className="form-group">
            <label>Dil Seçimi *</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isScanned}
                onChange={(e) => setIsScanned(e.target.checked)}
              />
              <span>Taranmış belge (daha yavaş ama daha hassas)</span>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={handleProcessDocument}
            disabled={loading}
          >
            {loading ? 'İşleniyor...' : '▶️ İşle'}
          </button>

          {processingResult && (
            <div className="processing-result">
              <h5>İşlem Sonucu</h5>
              <div className="result-stats">
                <div className="stat">
                  <span className="label">Kelime Sayısı:</span>
                  <span className="value">{processingResult.word_count}</span>
                </div>
                <div className="stat">
                  <span className="label">Güven Skoru:</span>
                  <span
                    className="value"
                    style={{ color: getConfidenceColor(processingResult.confidence) }}
                  >
                    {(processingResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="stat">
                  <span className="label">İşlem Süresi:</span>
                  <span className="value">{processingResult.processing_time.toFixed(2)}s</span>
                </div>
              </div>
              <div className="extracted-text">
                <h6>Çıkarılan Metin:</h6>
                <pre>{processingResult.extracted_text}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="mode-card">
          <h4>📚 Toplu Belge İşleme</h4>

          <div className="form-group">
            <label>Dosya Yolları *</label>
            {batchFiles.map((file, index) => (
              <div key={index} className="batch-file-input">
                <input
                  type="text"
                  value={file}
                  onChange={(e) => updateBatchFile(index, e.target.value)}
                  placeholder="/path/to/document.pdf"
                />
                <button
                  className="btn-icon btn-danger"
                  onClick={() => removeBatchFile(index)}
                  disabled={batchFiles.length === 1}
                >
                  ✖
                </button>
              </div>
            ))}
            <button className="btn-secondary" onClick={addBatchFile}>
              + Dosya Ekle
            </button>
          </div>

          <div className="form-group">
            <label>Dil Seçimi *</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn-primary"
            onClick={handleBatchProcess}
            disabled={loading}
          >
            {loading ? 'İşleniyor...' : '▶️ Toplu İşle'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render results tab
  const renderResults = () => (
    <div className="results-section">
      <div className="section-header">
        <h3>İşlenmiş Belgeler</h3>
        <div className="search-box">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Metin içinde ara..."
          />
          <button className="btn-secondary" onClick={handleSearch}>
            🔍 Ara
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Arama Sonuçları ({searchResults.length})</h4>
          {searchResults.map((match, index) => (
            <div key={index} className="search-result-item">
              <div className="result-file">{match.file_path}</div>
              <div className="result-context">...{match.context}...</div>
              <div className="result-meta">
                <span>Güven: {(match.confidence * 100).toFixed(1)}%</span>
                <span>{formatDate(match.created_at)}</span>
              </div>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setSearchResults([])}>
            Sonuçları Temizle
          </button>
        </div>
      )}

      <div className="results-grid">
        {results.length === 0 ? (
          <div className="empty-state">
            <p>Henüz işlenmiş belge yok</p>
          </div>
        ) : (
          results.map(result => (
            <div key={result.id} className="result-card">
              <div className="result-header">
                <div className="result-type-icon">
                  {result.file_type === 'image' && '🖼️'}
                  {result.file_type === 'pdf' && '📄'}
                  {result.file_type === 'text' && '📝'}
                </div>
                <div className="result-info">
                  <h4>{result.file_path.split('/').pop()}</h4>
                  <p className="result-path">{result.file_path}</p>
                </div>
              </div>

              <div className="result-stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Dil:</span>
                  <span className="stat-value">
                    {LANGUAGES.find(l => l.value === result.language)?.flag || '🌐'} {result.language}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Kelime:</span>
                  <span className="stat-value">{result.word_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Güven:</span>
                  <span
                    className="stat-value"
                    style={{ color: getConfidenceColor(result.confidence) }}
                  >
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tarih:</span>
                  <span className="stat-value">{formatDate(result.created_at)}</span>
                </div>
              </div>

              <div className="result-text-preview">
                <pre>{result.extracted_text.substring(0, 200)}...</pre>
              </div>

              <div className="result-actions">
                <button
                  className="btn-icon"
                  onClick={() => {
                    navigator.clipboard.writeText(result.extracted_text);
                    alert('Metin kopyalandı!');
                  }}
                  title="Metni Kopyala"
                >
                  📋
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteResult(result.id)}
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render statistics tab
  const renderStatistics = () => {
    if (!statistics) {
      return <div className="loading-container">Yükleniyor...</div>;
    }

    return (
      <div className="statistics-section">
        <div className="section-header">
          <h3>İstatistikler</h3>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_processed}</div>
              <div className="stat-label">Toplam İşlenen</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_words.toLocaleString()}</div>
              <div className="stat-label">Toplam Kelime</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <div className="stat-value">{(statistics.avg_confidence * 100).toFixed(1)}%</div>
              <div className="stat-label">Ort. Güven Skoru</div>
            </div>
          </div>
        </div>

        <div className="stats-breakdown">
          <div className="breakdown-section">
            <h4>Dillere Göre Dağılım</h4>
            <div className="breakdown-list">
              {Object.entries(statistics.by_language).map(([lang, count]) => (
                <div key={lang} className="breakdown-item">
                  <span className="breakdown-label">
                    {LANGUAGES.find(l => l.value === lang)?.flag || '🌐'} {lang}
                  </span>
                  <span className="breakdown-value">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="breakdown-section">
            <h4>Türlere Göre Dağılım</h4>
            <div className="breakdown-list">
              {Object.entries(statistics.by_type).map(([type, count]) => (
                <div key={type} className="breakdown-item">
                  <span className="breakdown-label">
                    {type === 'image' && '🖼️'}
                    {type === 'pdf' && '📄'}
                    {type === 'text' && '📝'}
                    {' ' + type}
                  </span>
                  <span className="breakdown-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ocr-processor">
      <div className="ocr-header">
        <h2>OCR & Belge İşleme</h2>
      </div>

      <div className="ocr-tabs">
        <button
          className={`tab-button ${activeTab === 'process' ? 'active' : ''}`}
          onClick={() => setActiveTab('process')}
        >
          ⚡ İşle
        </button>
        <button
          className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          📋 Sonuçlar
        </button>
        <button
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📊 İstatistikler
        </button>
      </div>

      <div className="ocr-content">
        {activeTab === 'process' && renderProcess()}
        {activeTab === 'results' && renderResults()}
        {activeTab === 'statistics' && renderStatistics()}
      </div>
    </div>
  );
};

export default OCRProcessor;
