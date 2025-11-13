import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function TagManager() {
  const [activeTab, setActiveTab] = useState('single');
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Single image state
  const [imagePath, setImagePath] = useState('');
  const [useClip, setUseClip] = useState(true);
  const [useVit, setUseVit] = useState(true);
  const [confidence, setConfidence] = useState(0.3);
  const [customLabels, setCustomLabels] = useState('');
  const [tagResult, setTagResult] = useState(null);

  // Batch tagging state
  const [imagePaths, setImagePaths] = useState('');
  const [batchResult, setBatchResult] = useState(null);

  // Categories state
  const [categories, setCategories] = useState(null);

  // Tag suggestions state
  const [existingTags, setExistingTags] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tagging/categories`);
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const initializeModels = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/tagging/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setModelsLoaded(true);
        alert(`Models loaded successfully!\nCLIP: ${data.models_loaded.clip ? '✅' : '❌'}\nViT: ${data.models_loaded.vit ? '✅' : '❌'}\nDevice: ${data.device}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Model initialization error:', error);
      alert(`Failed to initialize models: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tagSingleImage = async () => {
    if (!imagePath.trim()) {
      alert('Please enter image path');
      return;
    }

    setLoading(true);
    setTagResult(null);

    try {
      const customLabelsArray = customLabels
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

      const response = await fetch(`${API_BASE}/api/tagging/tag-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: imagePath,
          use_clip: useClip,
          use_vit: useVit,
          custom_labels: customLabelsArray,
          confidence_threshold: confidence
        })
      });

      const data = await response.json();

      if (data.success) {
        setTagResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Image tagging error:', error);
      alert(`Failed to tag image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tagBatchImages = async () => {
    if (!imagePaths.trim()) {
      alert('Please enter image paths');
      return;
    }

    setLoading(true);
    setBatchResult(null);

    try {
      const pathsArray = imagePaths
        .split('\n')
        .map(p => p.trim())
        .filter(p => p);

      const response = await fetch(`${API_BASE}/api/tagging/batch-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_paths: pathsArray,
          use_clip: useClip,
          use_vit: useVit,
          confidence_threshold: confidence
        })
      });

      const data = await response.json();

      if (data.success) {
        setBatchResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Batch tagging error:', error);
      alert(`Failed to tag images: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async () => {
    if (!existingTags.trim()) {
      alert('Please enter existing tags');
      return;
    }

    try {
      const tagsArray = existingTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      const response = await fetch(`${API_BASE}/api/tagging/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existing_tags: tagsArray
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Tag suggestion error:', error);
      alert(`Failed to get suggestions: ${error.message}`);
    }
  };

  return (
    <div className="tag-manager-container">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">🏷️ Intelligent Auto-Tagging</h3>
            <div className="card-description">
              Automatically tag images using CLIP and ViT AI models
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={initializeModels}
            disabled={loading || modelsLoaded}
          >
            {modelsLoaded ? '✅ Models Loaded' : '⚡ Initialize Models'}
          </button>
        </div>

        <div className="card-body">
          {/* Model Settings */}
          <div className="tagging-settings">
            <div className="form-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useClip}
                  onChange={(e) => setUseClip(e.target.checked)}
                />
                Use CLIP (Scene & Object Recognition)
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useVit}
                  onChange={(e) => setUseVit(e.target.checked)}
                />
                Use ViT (Image Classification)
              </label>
            </div>

            <div className="form-group">
              <label>Confidence Threshold: {confidence.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="slider"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'single' ? 'active' : ''}`}
              onClick={() => setActiveTab('single')}
            >
              🖼️ Single Image
            </button>
            <button
              className={`tab ${activeTab === 'batch' ? 'active' : ''}`}
              onClick={() => setActiveTab('batch')}
            >
              📁 Batch Tagging
            </button>
            <button
              className={`tab ${activeTab === 'suggestions' ? 'active' : ''}`}
              onClick={() => setActiveTab('suggestions')}
            >
              💡 Tag Suggestions
            </button>
            <button
              className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              📋 Categories
            </button>
          </div>

          {/* Single Image Tagging */}
          {activeTab === 'single' && (
            <div className="tagging-panel">
              <div className="form-group">
                <label>Image Path</label>
                <input
                  type="text"
                  className="input"
                  placeholder="/path/to/image.jpg"
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Custom Labels (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="sunset, vacation, beach (comma-separated)"
                  value={customLabels}
                  onChange={(e) => setCustomLabels(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={tagSingleImage}
                disabled={loading || !imagePath.trim() || !modelsLoaded}
              >
                {loading ? '⏳ Tagging...' : '🏷️ Tag Image'}
              </button>

              {tagResult && (
                <div className="tag-result">
                  <h4>🎯 Generated Tags</h4>
                  <div className="tags-cloud">
                    {tagResult.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="tag-chip"
                        title={`Confidence: ${(tagResult.confidence_scores[tag] * 100).toFixed(1)}%`}
                      >
                        {tag}
                        <span className="tag-confidence">
                          {(tagResult.confidence_scores[tag] * 100).toFixed(0)}%
                        </span>
                      </span>
                    ))}
                  </div>

                  {tagResult.categories && Object.keys(tagResult.categories).length > 0 && (
                    <>
                      <h4>📂 Categories</h4>
                      <div className="categories-list">
                        {Object.entries(tagResult.categories).map(([category, tags]) => (
                          <div key={category} className="category-group">
                            <div className="category-name">{category}</div>
                            <div className="category-tags">
                              {tags.map((tag, idx) => (
                                <span key={idx} className="category-tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {tagResult.metadata && (
                    <div className="tag-metadata">
                      <span>📐 Size: {tagResult.metadata.image_size?.join(' × ')}</span>
                      <span>🎨 Mode: {tagResult.metadata.mode}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Batch Tagging */}
          {activeTab === 'batch' && (
            <div className="tagging-panel">
              <div className="form-group">
                <label>Image Paths (one per line)</label>
                <textarea
                  className="textarea"
                  rows={10}
                  placeholder="/path/to/image1.jpg&#10;/path/to/image2.jpg&#10;/path/to/image3.jpg"
                  value={imagePaths}
                  onChange={(e) => setImagePaths(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={tagBatchImages}
                disabled={loading || !imagePaths.trim() || !modelsLoaded}
              >
                {loading ? '⏳ Processing...' : '🏷️ Tag All Images'}
              </button>

              {batchResult && (
                <div className="batch-result">
                  <div className="batch-stats">
                    <div className="stat-item">
                      <div className="stat-value">{batchResult.total}</div>
                      <div className="stat-label">Total</div>
                    </div>
                    <div className="stat-item success">
                      <div className="stat-value">{batchResult.tagged}</div>
                      <div className="stat-label">Tagged</div>
                    </div>
                    <div className="stat-item error">
                      <div className="stat-value">{batchResult.failed}</div>
                      <div className="stat-label">Failed</div>
                    </div>
                  </div>

                  <div className="batch-results-list">
                    {batchResult.results.map((item, index) => (
                      <div key={index} className="batch-result-item">
                        <div className="batch-result-header">
                          <span className="batch-result-path">{item.path}</span>
                          <span className={`batch-result-status ${item.result.success ? 'success' : 'error'}`}>
                            {item.result.success ? '✅' : '❌'}
                          </span>
                        </div>
                        {item.result.success && (
                          <div className="batch-result-tags">
                            {item.result.tags.slice(0, 10).map((tag, idx) => (
                              <span key={idx} className="mini-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                        {!item.result.success && (
                          <div className="batch-result-error">{item.result.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tag Suggestions */}
          {activeTab === 'suggestions' && (
            <div className="tagging-panel">
              <div className="form-group">
                <label>Existing Tags</label>
                <input
                  type="text"
                  className="input"
                  placeholder="nature, outdoor, landscape (comma-separated)"
                  value={existingTags}
                  onChange={(e) => setExistingTags(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={getSuggestions}
                disabled={!existingTags.trim()}
              >
                💡 Get Suggestions
              </button>

              {suggestions.length > 0 && (
                <div className="suggestions-result">
                  <h4>💡 Suggested Tags</h4>
                  <div className="tags-cloud">
                    {suggestions.map((tag, index) => (
                      <span key={index} className="suggestion-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories */}
          {activeTab === 'categories' && (
            <div className="tagging-panel">
              {categories ? (
                <div className="categories-display">
                  {Object.entries(categories).map(([category, labels]) => (
                    <div key={category} className="category-display-group">
                      <h4>{category}</h4>
                      <div className="category-labels">
                        {labels.map((label, idx) => (
                          <span key={idx} className="category-label">{label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Loading categories...</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> CLIP and ViT models require PyTorch and Transformers libraries.
            Initialize models before using tagging features.
          </div>
        </div>
      </div>
    </div>
  );
}
