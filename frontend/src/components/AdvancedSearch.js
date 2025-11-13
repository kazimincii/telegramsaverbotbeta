import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function AdvancedSearch() {
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('fuzzy');
  const [results, setResults] = useState(null);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sizeMin, setSizeMin] = useState('');
  const [sizeMax, setSizeMax] = useState('');
  const [mediaTypes, setMediaTypes] = useState([]);
  const [chats, setChats] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');

  // History & Saved searches
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState({});
  const [saveName, setSaveName] = useState('');

  // Image similarity
  const [referenceImage, setReferenceImage] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.8);
  const [similarityResults, setSimilarityResults] = useState(null);

  useEffect(() => {
    loadSearchHistory();
    loadSavedSearches();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/search/history?limit=20`);
      const data = await response.json();

      if (data.success) {
        setSearchHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/search/saved`);
      const data = await response.json();

      if (data.success) {
        setSavedSearches(data.saved_searches);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      // Build filters
      const filters = {};

      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (sizeMin) filters.size_min = parseInt(sizeMin);
      if (sizeMax) filters.size_max = parseInt(sizeMax);
      if (mediaTypes.length > 0) filters.media_types = mediaTypes;
      if (chats) filters.chats = chats.split(',').map(c => c.trim());
      if (tags) filters.tags = tags.split(',').map(t => t.trim());
      if (status) filters.status = status;

      const response = await fetch(`${API_BASE}/api/search/advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          mode: searchMode,
          filters,
          limit: 100,
          offset: 0,
          sort_by: sortBy,
          sort_order: sortOrder
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        loadSearchHistory(); // Refresh history
      } else {
        alert(`Search error: ${data.error}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(`Failed to search: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentSearch = async () => {
    if (!saveName.trim()) {
      alert('Please enter a name for this search');
      return;
    }

    try {
      const filters = {};
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (sizeMin) filters.size_min = parseInt(sizeMin);
      if (sizeMax) filters.size_max = parseInt(sizeMax);
      if (mediaTypes.length > 0) filters.media_types = mediaTypes;

      const response = await fetch(`${API_BASE}/api/search/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          query,
          mode: searchMode,
          filters
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Search saved as "${saveName}"`);
        setSaveName('');
        loadSavedSearches();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Save search error:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  const loadSavedSearch = (searchData) => {
    setQuery(searchData.query);
    setSearchMode(searchData.mode);

    // Load filters
    const filters = searchData.filters || {};
    setDateFrom(filters.date_from || '');
    setDateTo(filters.date_to || '');
    setSizeMin(filters.size_min ? filters.size_min.toString() : '');
    setSizeMax(filters.size_max ? filters.size_max.toString() : '');
    setMediaTypes(filters.media_types || []);

    setActiveTab('search');
  };

  const deleteSaved = async (name) => {
    if (!window.confirm(`Delete saved search "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/search/saved/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear all search history?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/search/history/clear`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSearchHistory([]);
      }
    } catch (error) {
      console.error('Clear history error:', error);
    }
  };

  const searchSimilarImages = async () => {
    if (!referenceImage.trim()) {
      alert('Please enter reference image path');
      return;
    }

    setLoading(true);
    setSimilarityResults(null);

    try {
      const response = await fetch(`${API_BASE}/api/search/image-similarity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_image_path: referenceImage,
          threshold: similarityThreshold,
          limit: 50
        })
      });

      const data = await response.json();

      if (data.success) {
        setSimilarityResults(data);
      } else {
        alert(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Similarity search error:', error);
      alert(`Failed to search: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMediaType = (type) => {
    if (mediaTypes.includes(type)) {
      setMediaTypes(mediaTypes.filter(t => t !== type));
    } else {
      setMediaTypes([...mediaTypes, type]);
    }
  };

  return (
    <div className="advanced-search-container">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔍 Advanced Search & Filtering</h3>
          <div className="card-description">
            Powerful search with fuzzy matching, regex, and advanced filters
          </div>
        </div>

        <div className="card-body">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 Search
            </button>
            <button
              className={`tab ${activeTab === 'similarity' ? 'active' : ''}`}
              onClick={() => setActiveTab('similarity')}
            >
              🖼️ Image Similarity
            </button>
            <button
              className={`tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 History
            </button>
            <button
              className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              ⭐ Saved Searches
            </button>
          </div>

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="search-panel">
              {/* Search Bar */}
              <div className="search-bar-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search files, chats, tags..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                />
                <button
                  className="btn btn-primary search-button"
                  onClick={performSearch}
                  disabled={loading || !query.trim()}
                >
                  {loading ? '⏳' : '🔍'} Search
                </button>
              </div>

              {/* Search Mode */}
              <div className="search-mode-selector">
                <button
                  className={`mode-btn ${searchMode === 'fuzzy' ? 'active' : ''}`}
                  onClick={() => setSearchMode('fuzzy')}
                >
                  🎯 Fuzzy
                </button>
                <button
                  className={`mode-btn ${searchMode === 'exact' ? 'active' : ''}`}
                  onClick={() => setSearchMode('exact')}
                >
                  ✓ Exact
                </button>
                <button
                  className={`mode-btn ${searchMode === 'regex' ? 'active' : ''}`}
                  onClick={() => setSearchMode('regex')}
                >
                  📝 Regex
                </button>
                <button
                  className={`mode-btn ${searchMode === 'fulltext' ? 'active' : ''}`}
                  onClick={() => setSearchMode('fulltext')}
                >
                  📄 Full-text
                </button>
              </div>

              {/* Filters Toggle */}
              <button
                className="filters-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '▼' : '▶'} {showFilters ? 'Hide' : 'Show'} Filters
              </button>

              {/* Filters Panel */}
              {showFilters && (
                <div className="filters-panel">
                  <div className="filter-section">
                    <h4>📅 Date Range</h4>
                    <div className="filter-row">
                      <div className="filter-group">
                        <label>From</label>
                        <input
                          type="date"
                          className="input-sm"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="filter-group">
                        <label>To</label>
                        <input
                          type="date"
                          className="input-sm"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4>📏 File Size (bytes)</h4>
                    <div className="filter-row">
                      <div className="filter-group">
                        <label>Min</label>
                        <input
                          type="number"
                          className="input-sm"
                          placeholder="0"
                          value={sizeMin}
                          onChange={(e) => setSizeMin(e.target.value)}
                        />
                      </div>
                      <div className="filter-group">
                        <label>Max</label>
                        <input
                          type="number"
                          className="input-sm"
                          placeholder="∞"
                          value={sizeMax}
                          onChange={(e) => setSizeMax(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4>🎬 Media Types</h4>
                    <div className="media-type-grid">
                      {['photos', 'videos', 'audio', 'documents'].map(type => (
                        <label key={type} className="checkbox-label-inline">
                          <input
                            type="checkbox"
                            checked={mediaTypes.includes(type)}
                            onChange={() => toggleMediaType(type)}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4>💬 Chats</h4>
                    <input
                      type="text"
                      className="input"
                      placeholder="chat1, chat2, chat3 (comma-separated)"
                      value={chats}
                      onChange={(e) => setChats(e.target.value)}
                    />
                  </div>

                  <div className="filter-section">
                    <h4>🏷️ Tags</h4>
                    <input
                      type="text"
                      className="input"
                      placeholder="tag1, tag2, tag3 (comma-separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>

                  <div className="filter-section">
                    <h4>📊 Sort By</h4>
                    <div className="filter-row">
                      <select
                        className="select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="relevance">Relevance</option>
                        <option value="date">Date</option>
                        <option value="size">Size</option>
                        <option value="name">Name</option>
                      </select>
                      <select
                        className="select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Search */}
              <div className="save-search-bar">
                <input
                  type="text"
                  className="input-sm"
                  placeholder="Save this search as..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={saveCurrentSearch}
                  disabled={!query.trim() || !saveName.trim()}
                >
                  ⭐ Save
                </button>
              </div>

              {/* Results */}
              {results && (
                <div className="search-results">
                  <div className="results-header">
                    <h4>Search Results</h4>
                    <div className="results-meta">
                      Found {results.total} results in {results.mode} mode
                    </div>
                  </div>

                  {results.results.length > 0 ? (
                    <div className="results-list">
                      {results.results.map((item, index) => (
                        <div key={index} className="result-item">
                          <div className="result-header">
                            <span className="result-filename">
                              {item.filename || item.name || 'Unknown'}
                            </span>
                            {item.relevance_score && (
                              <span className="result-score">
                                {(item.relevance_score * 100).toFixed(0)}% match
                              </span>
                            )}
                          </div>
                          <div className="result-details">
                            {item.chat && <span>💬 {item.chat}</span>}
                            {item.timestamp && <span>📅 {new Date(item.timestamp).toLocaleDateString()}</span>}
                            {item.size && <span>📏 {(item.size / 1024).toFixed(2)} KB</span>}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="result-tags">
                              {item.tags.map((tag, i) => (
                                <span key={i} className="result-tag">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-results">
                      <div className="empty-icon">🔍</div>
                      <div className="empty-text">No results found</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Image Similarity Tab */}
          {activeTab === 'similarity' && (
            <div className="search-panel">
              <div className="form-group">
                <label>Reference Image Path</label>
                <input
                  type="text"
                  className="input"
                  placeholder="/path/to/reference/image.jpg"
                  value={referenceImage}
                  onChange={(e) => setReferenceImage(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Similarity Threshold: {similarityThreshold.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  className="slider"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={searchSimilarImages}
                disabled={loading || !referenceImage.trim()}
              >
                {loading ? '⏳ Searching...' : '🖼️ Find Similar Images'}
              </button>

              {similarityResults && (
                <div className="similarity-results">
                  <p className="info-message">{similarityResults.message}</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="search-panel">
              <div className="history-header">
                <h4>Search History</h4>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={clearHistory}
                  disabled={searchHistory.length === 0}
                >
                  🗑️ Clear All
                </button>
              </div>

              {searchHistory.length > 0 ? (
                <div className="history-list">
                  {searchHistory.map((item, index) => (
                    <div
                      key={index}
                      className="history-item"
                      onClick={() => {
                        setQuery(item.query);
                        setSearchMode(item.mode);
                        setActiveTab('search');
                      }}
                    >
                      <div className="history-query">{item.query}</div>
                      <div className="history-meta">
                        <span className="history-mode">{item.mode}</span>
                        <span className="history-time">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📜</div>
                  <div className="empty-text">No search history</div>
                </div>
              )}
            </div>
          )}

          {/* Saved Searches Tab */}
          {activeTab === 'saved' && (
            <div className="search-panel">
              <h4>Saved Searches</h4>

              {Object.keys(savedSearches).length > 0 ? (
                <div className="saved-list">
                  {Object.entries(savedSearches).map(([name, data]) => (
                    <div key={name} className="saved-item">
                      <div className="saved-header">
                        <span className="saved-name">⭐ {name}</span>
                        <div className="saved-actions">
                          <button
                            className="btn-icon"
                            onClick={() => loadSavedSearch(data)}
                            title="Load"
                          >
                            📂
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => deleteSaved(name)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="saved-query">{data.query}</div>
                      <div className="saved-meta">
                        <span>{data.mode} mode</span>
                        <span>{new Date(data.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">⭐</div>
                  <div className="empty-text">No saved searches</div>
                  <div className="empty-hint">Save searches for quick access later</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> Use fuzzy search for typo tolerance, regex for patterns, and filters for precise results
          </div>
        </div>
      </div>
    </div>
  );
}
