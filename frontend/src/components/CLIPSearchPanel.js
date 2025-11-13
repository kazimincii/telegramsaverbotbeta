import React, { useState } from "react";

export default function CLIPSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const initializeCLIP = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/clip/initialize", {
        method: "POST",
      });
      const data = await response.json();
      if (data.ok) {
        setInitialized(true);
        alert("CLIP model initialized successfully!");
      } else {
        alert("Failed to initialize CLIP: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const searchImages = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/clip/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          top_n: 10,
          threshold: 0.2,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setResults(data.results);
      } else {
        alert("Search failed");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="clip-search-panel" style={styles.container}>
      <h2 style={styles.title}>🧠 AI-Powered Image Search (CLIP)</h2>

      {!initialized && (
        <div style={styles.initSection}>
          <p style={styles.info}>
            CLIP AI lets you search images using natural language.
            <br />
            Example: "photos with cats and dogs", "sunset at beach"
          </p>
          <button
            onClick={initializeCLIP}
            disabled={loading}
            style={styles.initButton}
          >
            {loading ? "Loading Model..." : "Initialize CLIP Model"}
          </button>
        </div>
      )}

      {initialized && (
        <>
          <form onSubmit={searchImages} style={styles.form}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what you're looking for..."
              style={styles.input}
              disabled={loading}
            />
            <button type="submit" disabled={loading} style={styles.searchButton}>
              {loading ? "Searching..." : "🔍 Search"}
            </button>
          </form>

          {results.length > 0 && (
            <div style={styles.results}>
              <h3>Found {results.length} results:</h3>
              {results.map((result, idx) => (
                <div key={idx} style={styles.resultItem}>
                  <div style={styles.resultInfo}>
                    <strong>File:</strong> {result.file}
                    <br />
                    <strong>Confidence:</strong>{" "}
                    {(result.score * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "var(--bg-secondary, #f5f5f5)",
    borderRadius: "8px",
    marginTop: "20px",
  },
  title: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "var(--text-primary, #333)",
  },
  initSection: {
    textAlign: "center",
    padding: "40px 20px",
  },
  info: {
    fontSize: "16px",
    marginBottom: "20px",
    color: "var(--text-secondary, #666)",
    lineHeight: "1.6",
  },
  initButton: {
    padding: "12px 30px",
    fontSize: "16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  form: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  input: {
    flex: 1,
    padding: "12px",
    fontSize: "16px",
    border: "1px solid var(--border-color, #ddd)",
    borderRadius: "4px",
  },
  searchButton: {
    padding: "12px 24px",
    fontSize: "16px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  results: {
    marginTop: "20px",
  },
  resultItem: {
    padding: "15px",
    backgroundColor: "white",
    borderRadius: "4px",
    marginBottom: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  resultInfo: {
    fontSize: "14px",
    lineHeight: "1.6",
  },
};
