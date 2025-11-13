import React, { useState, useEffect } from "react";

export default function VideoProcessor() {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [features, setFeatures] = useState({});

  // Form states
  const [thumbnailPath, setThumbnailPath] = useState("");
  const [compressPath, setCompressPath] = useState("");
  const [transcribePath, setTranscribePath] = useState("");
  const [quality, setQuality] = useState(23);

  // Results
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/video/status");
      const data = await response.json();
      if (data.ok) {
        setAvailable(data.available);
        setFeatures(data.features);
      }
    } catch (error) {
      console.error("Error checking video processor status:", error);
    }
  };

  const generateThumbnail = async (e) => {
    e.preventDefault();
    if (!thumbnailPath.trim()) {
      alert("Please enter a video file path");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/video/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_path: thumbnailPath }),
      });

      const data = await response.json();
      if (data.ok) {
        setResult({
          type: "thumbnail",
          message: `Thumbnail generated successfully!`,
          path: data.thumbnail_path,
        });
      } else {
        alert("Failed: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }

    setLoading(false);
  };

  const compressVideo = async (e) => {
    e.preventDefault();
    if (!compressPath.trim()) {
      alert("Please enter a video file path");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/video/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_path: compressPath,
          quality: quality,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setResult({
          type: "compress",
          message: `Video compressed successfully! (${data.savings_percent}% smaller)`,
          path: data.compressed_path,
          originalSize: formatBytes(data.original_size),
          compressedSize: formatBytes(data.compressed_size),
          savings: data.savings_percent,
        });
      } else {
        alert("Failed: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }

    setLoading(false);
  };

  const transcribeVideo = async (e) => {
    e.preventDefault();
    if (!transcribePath.trim()) {
      alert("Please enter a video file path");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/video/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_path: transcribePath }),
      });

      const data = await response.json();
      if (data.ok) {
        setResult({
          type: "transcribe",
          message: "Transcription completed!",
          transcription: data.transcription,
        });
      } else {
        alert("Failed: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎬 Video Processing</h2>

      <p style={styles.description}>
        Process video files: generate thumbnails, compress videos, and transcribe audio to text.
      </p>

      {/* Status Card */}
      <div style={styles.statusCard}>
        <h3 style={styles.statusTitle}>Processor Status</h3>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>OpenCV (Thumbnails)</span>
            <span
              style={{
                ...styles.statusBadge,
                ...(features.thumbnails
                  ? styles.statusBadgeActive
                  : styles.statusBadgeInactive),
              }}
            >
              {features.thumbnails ? "✓ Available" : "✗ Not Installed"}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>FFmpeg (Compression)</span>
            <span
              style={{
                ...styles.statusBadge,
                ...(features.compression
                  ? styles.statusBadgeActive
                  : styles.statusBadgeInactive),
              }}
            >
              {features.compression ? "✓ Available" : "✗ Not Installed"}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Whisper AI (Transcription)</span>
            <span
              style={{
                ...styles.statusBadge,
                ...(features.transcription
                  ? styles.statusBadgeActive
                  : styles.statusBadgeInactive),
              }}
            >
              {features.transcription ? "✓ Available" : "✗ Not Installed"}
            </span>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div style={styles.resultCard}>
          <h3 style={styles.resultTitle}>✓ {result.message}</h3>
          {result.type === "thumbnail" && (
            <p style={styles.resultText}>Thumbnail path: {result.path}</p>
          )}
          {result.type === "compress" && (
            <div style={styles.compressStats}>
              <p style={styles.resultText}>
                Compressed file: {result.path}
              </p>
              <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Original</span>
                  <span style={styles.statValue}>{result.originalSize}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Compressed</span>
                  <span style={styles.statValue}>{result.compressedSize}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Savings</span>
                  <span style={styles.statValue}>{result.savings}%</span>
                </div>
              </div>
            </div>
          )}
          {result.type === "transcribe" && (
            <div style={styles.transcriptionBox}>
              <p style={styles.transcriptionText}>{result.transcription}</p>
            </div>
          )}
        </div>
      )}

      {/* Thumbnail Generation */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📸 Generate Thumbnail</h3>
        <form onSubmit={generateThumbnail} style={styles.form}>
          <input
            type="text"
            value={thumbnailPath}
            onChange={(e) => setThumbnailPath(e.target.value)}
            placeholder="/path/to/video.mp4"
            style={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            style={styles.button}
            disabled={loading || !features.thumbnails}
          >
            {loading ? "Generating..." : "Generate Thumbnail"}
          </button>
        </form>
        {!features.thumbnails && (
          <p style={styles.helpText}>
            ⚠️ OpenCV is not installed. Install with: pip install opencv-python
          </p>
        )}
      </div>

      {/* Video Compression */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🗜️ Compress Video</h3>
        <form onSubmit={compressVideo} style={styles.form}>
          <input
            type="text"
            value={compressPath}
            onChange={(e) => setCompressPath(e.target.value)}
            placeholder="/path/to/video.mp4"
            style={styles.input}
            disabled={loading}
          />

          <div style={styles.sliderGroup}>
            <label style={styles.label}>
              Quality (CRF): {quality}
              <span style={styles.qualityHint}>
                {quality < 18
                  ? " (High)"
                  : quality < 28
                  ? " (Medium)"
                  : " (Low)"}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="51"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              style={styles.slider}
              disabled={loading}
            />
            <p style={styles.sliderHelp}>
              Lower values = better quality, larger file size
            </p>
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading || !features.compression}
          >
            {loading ? "Compressing..." : "Compress Video"}
          </button>
        </form>
        {!features.compression && (
          <p style={styles.helpText}>
            ⚠️ FFmpeg is not installed. Install with: pip install ffmpeg-python
          </p>
        )}
      </div>

      {/* Audio Transcription */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🎤 Transcribe Audio</h3>
        <form onSubmit={transcribeVideo} style={styles.form}>
          <input
            type="text"
            value={transcribePath}
            onChange={(e) => setTranscribePath(e.target.value)}
            placeholder="/path/to/video.mp4"
            style={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            style={styles.button}
            disabled={loading || !features.transcription}
          >
            {loading ? "Transcribing..." : "Transcribe Audio"}
          </button>
        </form>
        {!features.transcription && (
          <p style={styles.helpText}>
            ⚠️ Whisper AI is not installed. Install with: pip install openai-whisper
          </p>
        )}
        <p style={styles.helpText}>
          Note: First-time transcription will download Whisper model (~150MB)
        </p>
      </div>
    </div>
  );
}

// Helper function
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
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
    marginBottom: "10px",
    color: "var(--text-primary, #333)",
  },
  description: {
    fontSize: "14px",
    color: "var(--text-secondary, #666)",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  statusCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  statusTitle: {
    fontSize: "16px",
    marginBottom: "15px",
    color: "var(--text-primary, #333)",
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },
  statusItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  statusLabel: {
    fontSize: "13px",
    color: "var(--text-secondary, #666)",
  },
  statusBadge: {
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: "bold",
    display: "inline-block",
  },
  statusBadgeActive: {
    backgroundColor: "#4CAF50",
    color: "white",
  },
  statusBadgeInactive: {
    backgroundColor: "#f44336",
    color: "white",
  },
  resultCard: {
    backgroundColor: "#E8F5E9",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "2px solid #4CAF50",
  },
  resultTitle: {
    fontSize: "16px",
    color: "#2E7D32",
    marginBottom: "10px",
  },
  resultText: {
    fontSize: "14px",
    color: "var(--text-primary, #333)",
    marginBottom: "10px",
    wordBreak: "break-all",
  },
  compressStats: {
    marginTop: "10px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
    marginTop: "15px",
  },
  statItem: {
    textAlign: "center",
  },
  statLabel: {
    fontSize: "12px",
    color: "var(--text-secondary, #666)",
    display: "block",
    marginBottom: "5px",
  },
  statValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "var(--text-primary, #333)",
    display: "block",
  },
  transcriptionBox: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "4px",
    marginTop: "10px",
    maxHeight: "300px",
    overflowY: "auto",
  },
  transcriptionText: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "var(--text-primary, #333)",
    whiteSpace: "pre-wrap",
  },
  section: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "15px",
    color: "var(--text-primary, #333)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "12px",
    fontSize: "14px",
    border: "1px solid var(--border-color, #ddd)",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  sliderGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "var(--text-primary, #333)",
  },
  qualityHint: {
    fontSize: "12px",
    fontWeight: "normal",
    color: "var(--text-secondary, #666)",
  },
  slider: {
    width: "100%",
    height: "6px",
  },
  sliderHelp: {
    fontSize: "12px",
    color: "var(--text-secondary, #999)",
    margin: 0,
  },
  button: {
    padding: "12px 24px",
    fontSize: "14px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  helpText: {
    fontSize: "12px",
    color: "var(--text-secondary, #999)",
    marginTop: "10px",
    lineHeight: "1.5",
  },
};
