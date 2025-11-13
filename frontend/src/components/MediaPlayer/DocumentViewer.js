/**
 * Document Viewer Component (PDF.js based)
 * Supports PDF, text files, and other documents
 */

import React, { useState, useEffect, useRef } from 'react';

export default function DocumentViewer({ document }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showOutline, setShowOutline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchResult, setCurrentSearchResult] = useState(0);
  const [documentContent, setDocumentContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  const isPDF = document.name?.toLowerCase().endsWith('.pdf');
  const isText = document.name?.toLowerCase().match(/\.(txt|md|log|json|xml|csv)$/);

  useEffect(() => {
    loadDocument();
  }, [document]);

  /**
   * Load document
   */
  const loadDocument = async () => {
    setLoading(true);

    try {
      if (isPDF) {
        // In a real implementation, this would use PDF.js library
        // For now, we'll use iframe or object tag
        setDocumentContent({
          type: 'pdf',
          url: document.url || document.path
        });
        setTotalPages(document.pages || 1);
      } else if (isText) {
        // Load text content
        const response = await fetch(document.url || document.path);
        const text = await response.text();
        setDocumentContent({
          type: 'text',
          content: text
        });
      } else {
        // Generic document (use iframe)
        setDocumentContent({
          type: 'generic',
          url: document.url || document.path
        });
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate pages
   */
  const goToPage = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const previousPage = () => goToPage(currentPage - 1);

  /**
   * Zoom controls
   */
  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  /**
   * Rotation
   */
  const rotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const rotateCounterClockwise = () => setRotation((prev) => (prev - 90 + 360) % 360);

  /**
   * Search in document
   */
  const handleSearch = () => {
    if (!searchQuery || !documentContent) return;

    if (documentContent.type === 'text') {
      const content = documentContent.content.toLowerCase();
      const query = searchQuery.toLowerCase();
      const results = [];
      let index = 0;

      while ((index = content.indexOf(query, index)) !== -1) {
        results.push(index);
        index += query.length;
      }

      setSearchResults(results);
      setCurrentSearchResult(0);

      if (results.length > 0) {
        highlightSearchResult(results[0]);
      }
    }
  };

  /**
   * Navigate search results
   */
  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const next = (currentSearchResult + 1) % searchResults.length;
    setCurrentSearchResult(next);
    highlightSearchResult(searchResults[next]);
  };

  const previousSearchResult = () => {
    if (searchResults.length === 0) return;
    const prev = (currentSearchResult - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchResult(prev);
    highlightSearchResult(searchResults[prev]);
  };

  /**
   * Highlight search result
   */
  const highlightSearchResult = (index) => {
    if (!contentRef.current) return;

    // Scroll to position
    const charHeight = 20; // Approximate character height
    const lineHeight = 24;
    const charsPerLine = 80; // Approximate
    const line = Math.floor(index / charsPerLine);
    const scrollPos = line * lineHeight;

    contentRef.current.scrollTop = scrollPos;
  };

  /**
   * Download document
   */
  const downloadDocument = () => {
    const link = document.createElement('a');
    link.href = document.url || document.path;
    link.download = document.name || 'document.pdf';
    link.click();
  };

  /**
   * Print document
   */
  const printDocument = () => {
    window.print();
  };

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          previousPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
          nextPage();
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
        case 'r':
          rotateClockwise();
          break;
        case 'Home':
          goToPage(1);
          break;
        case 'End':
          goToPage(totalPages);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

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
    <div className="document-viewer">
      {/* Top Toolbar */}
      <div className="document-toolbar">
        {/* Left Section - Navigation */}
        <div className="toolbar-section">
          {isPDF && (
            <>
              <button onClick={previousPage} disabled={currentPage === 1} className="toolbar-btn">
                ◀
              </button>
              <div className="page-controls">
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  min={1}
                  max={totalPages}
                  className="page-input"
                />
                <span className="page-total">/ {totalPages}</span>
              </div>
              <button onClick={nextPage} disabled={currentPage === totalPages} className="toolbar-btn">
                ▶
              </button>
            </>
          )}
        </div>

        {/* Center Section - Zoom & Rotation */}
        <div className="toolbar-section">
          <button onClick={zoomOut} className="toolbar-btn" title="Zoom Out (-)">
            −
          </button>
          <span className="zoom-display">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="toolbar-btn" title="Zoom In (+)">
            +
          </button>
          <button onClick={resetZoom} className="toolbar-btn" title="Reset (0)">
            100%
          </button>

          {isPDF && (
            <>
              <div className="toolbar-divider"></div>
              <button onClick={rotateCounterClockwise} className="toolbar-btn" title="Rotate Left">
                ↶
              </button>
              <button onClick={rotateClockwise} className="toolbar-btn" title="Rotate Right (r)">
                ↷
              </button>
            </>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="toolbar-section">
          <button
            onClick={() => setShowOutline(!showOutline)}
            className={`toolbar-btn ${showOutline ? 'active' : ''}`}
            title="Outline"
          >
            📑
          </button>
          <button onClick={downloadDocument} className="toolbar-btn" title="Download">
            💾
          </button>
          <button onClick={printDocument} className="toolbar-btn" title="Print">
            🖨️
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="document-search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search in document..."
          className="search-input"
        />
        <button onClick={handleSearch} className="search-btn">
          🔍
        </button>
        {searchResults.length > 0 && (
          <div className="search-results-nav">
            <span className="search-counter">
              {currentSearchResult + 1} / {searchResults.length}
            </span>
            <button onClick={previousSearchResult} className="search-nav-btn">
              ▲
            </button>
            <button onClick={nextSearchResult} className="search-nav-btn">
              ▼
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="document-content-container">
        {/* Outline Sidebar */}
        {showOutline && (
          <div className="document-outline">
            <h4>Outline</h4>
            {/* In a real implementation, this would show PDF outline/bookmarks */}
            <div className="outline-placeholder">
              No outline available
            </div>
          </div>
        )}

        {/* Document Content */}
        <div
          ref={containerRef}
          className="document-content-wrapper"
        >
          {loading ? (
            <div className="document-loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading document...</div>
            </div>
          ) : (
            <div
              ref={contentRef}
              className="document-content"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center top'
              }}
            >
              {documentContent?.type === 'pdf' && (
                <object
                  data={documentContent.url}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="pdf-object"
                >
                  <iframe
                    src={`${documentContent.url}#page=${currentPage}`}
                    width="100%"
                    height="100%"
                    className="pdf-iframe"
                  >
                    <p>Your browser does not support PDFs. <a href={documentContent.url}>Download the PDF</a>.</p>
                  </iframe>
                </object>
              )}

              {documentContent?.type === 'text' && (
                <pre className="text-content">
                  {documentContent.content}
                </pre>
              )}

              {documentContent?.type === 'generic' && (
                <iframe
                  src={documentContent.url}
                  width="100%"
                  height="100%"
                  className="generic-iframe"
                >
                  <p>Cannot display document. <a href={documentContent.url}>Download the document</a>.</p>
                </iframe>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="document-status-bar">
        <div className="status-left">
          <span className="document-name">{document.name}</span>
          {document.size && (
            <span className="document-size">{formatFileSize(document.size)}</span>
          )}
        </div>
        <div className="status-right">
          <span className="keyboard-hint">
            ← → Pages • ± Zoom • r Rotate • Home/End Jump
          </span>
        </div>
      </div>
    </div>
  );
}
