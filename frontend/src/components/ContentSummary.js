import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function ContentSummary() {
  const { cfg } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(false);

  // Text summarization state
  const [textInput, setTextInput] = useState('');
  const [textStyle, setTextStyle] = useState('concise');
  const [textResult, setTextResult] = useState(null);

  // Message summarization state
  const [messagesInput, setMessagesInput] = useState('');
  const [messagesResult, setMessagesResult] = useState(null);

  // Audio/Video state
  const [filePath, setFilePath] = useState('');
  const [audioLanguage, setAudioLanguage] = useState('');
  const [audioTranslate, setAudioTranslate] = useState(false);
  const [audioResult, setAudioResult] = useState(null);
  const [videoResult, setVideoResult] = useState(null);

  const summarizeText = async () => {
    if (!textInput.trim()) {
      alert('Please enter text to summarize');
      return;
    }

    setLoading(true);
    setTextResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/summarize/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textInput,
          style: textStyle,
          max_length: 500,
          extract_keywords: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setTextResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Text summarization error:', error);
      alert(`Failed to summarize: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const summarizeMessages = async () => {
    if (!messagesInput.trim()) {
      alert('Please enter messages to summarize');
      return;
    }

    setLoading(true);
    setMessagesResult(null);

    try {
      // Parse messages (format: [timestamp] sender: message)
      const lines = messagesInput.split('\n').filter(line => line.trim());
      const messages = lines.map(line => {
        const match = line.match(/^\[(.+?)\]\s*(.+?):\s*(.+)$/);
        if (match) {
          return {
            timestamp: match[1],
            sender: match[2],
            text: match[3]
          };
        }
        return { text: line, sender: 'Unknown', timestamp: '' };
      });

      const response = await fetch(`${API_BASE}/api/summarize/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          style: 'concise'
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessagesResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Message summarization error:', error);
      alert(`Failed to summarize: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const transcribeAudio = async () => {
    if (!filePath.trim()) {
      alert('Please enter audio file path');
      return;
    }

    setLoading(true);
    setAudioResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/summarize/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          language: audioLanguage || null,
          translate: audioTranslate
        })
      });

      const data = await response.json();

      if (data.success) {
        setAudioResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Audio transcription error:', error);
      alert(`Failed to transcribe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const summarizeVideo = async () => {
    if (!filePath.trim()) {
      alert('Please enter video file path');
      return;
    }

    setLoading(true);
    setVideoResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/summarize/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          style: textStyle
        })
      });

      const data = await response.json();

      if (data.success) {
        setVideoResult(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Video summarization error:', error);
      alert(`Failed to summarize video: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-summary-container">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📝 Smart Content Summarization</h3>
          <div className="card-description">
            Summarize text, messages, audio, and video using AI
          </div>
        </div>

        <div className="card-body">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              📄 Text
            </button>
            <button
              className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              💬 Messages
            </button>
            <button
              className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
            >
              🎵 Audio
            </button>
            <button
              className={`tab ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => setActiveTab('video')}
            >
              🎥 Video
            </button>
          </div>

          {/* Text Summarization */}
          {activeTab === 'text' && (
            <div className="summary-panel">
              <div className="form-group">
                <label>Text to Summarize</label>
                <textarea
                  className="textarea"
                  rows={10}
                  placeholder="Paste your text here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Summary Style</label>
                <select
                  className="select"
                  value={textStyle}
                  onChange={(e) => setTextStyle(e.target.value)}
                >
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="bullet-points">Bullet Points</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={summarizeText}
                disabled={loading || !textInput.trim()}
              >
                {loading ? '⏳ Summarizing...' : '✨ Summarize Text'}
              </button>

              {textResult && (
                <div className="summary-result">
                  <h4>📊 Summary</h4>
                  <div className="summary-content">{textResult.summary}</div>

                  {textResult.key_points && textResult.key_points.length > 0 && (
                    <>
                      <h4>🔑 Key Points</h4>
                      <ul className="key-points-list">
                        {textResult.key_points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="summary-meta">
                    <span>📏 Original: {textResult.word_count} words</span>
                    <span>📐 Summary: {textResult.summary_word_count} words</span>
                    <span>🌍 Language: {textResult.language}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message Summarization */}
          {activeTab === 'messages' && (
            <div className="summary-panel">
              <div className="form-group">
                <label>Chat Messages</label>
                <textarea
                  className="textarea"
                  rows={10}
                  placeholder="[2024-01-15 10:30] John: Hello everyone&#10;[2024-01-15 10:31] Jane: Hi John!"
                  value={messagesInput}
                  onChange={(e) => setMessagesInput(e.target.value)}
                />
                <div className="form-hint">
                  Format: [timestamp] sender: message
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={summarizeMessages}
                disabled={loading || !messagesInput.trim()}
              >
                {loading ? '⏳ Analyzing...' : '✨ Summarize Conversation'}
              </button>

              {messagesResult && (
                <div className="summary-result">
                  <h4>📊 Conversation Summary</h4>
                  <div className="summary-content">{messagesResult.summary}</div>

                  {messagesResult.topics && messagesResult.topics.length > 0 && (
                    <>
                      <h4>💡 Topics Discussed</h4>
                      <div className="topics-list">
                        {messagesResult.topics.map((topic, index) => (
                          <span key={index} className="topic-tag">{topic}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {messagesResult.action_items && messagesResult.action_items.length > 0 && (
                    <>
                      <h4>✅ Action Items</h4>
                      <ul className="action-items-list">
                        {messagesResult.action_items.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="summary-meta">
                    <span>💬 Messages: {messagesResult.message_count}</span>
                    <span>😊 Sentiment: {messagesResult.sentiment}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audio Transcription */}
          {activeTab === 'audio' && (
            <div className="summary-panel">
              <div className="form-group">
                <label>Audio File Path</label>
                <input
                  type="text"
                  className="input"
                  placeholder="/path/to/audio.mp3"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Language (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="en, tr, es, etc."
                    value={audioLanguage}
                    onChange={(e) => setAudioLanguage(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={audioTranslate}
                      onChange={(e) => setAudioTranslate(e.target.checked)}
                    />
                    Translate to English
                  </label>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={transcribeAudio}
                disabled={loading || !filePath.trim()}
              >
                {loading ? '⏳ Transcribing...' : '🎵 Transcribe Audio'}
              </button>

              {audioResult && (
                <div className="summary-result">
                  <h4>📝 Transcript</h4>
                  <div className="summary-content">{audioResult.text}</div>

                  <div className="summary-meta">
                    <span>🌍 Language: {audioResult.language}</span>
                    {audioResult.duration && (
                      <span>⏱️ Duration: {audioResult.duration}s</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Summarization */}
          {activeTab === 'video' && (
            <div className="summary-panel">
              <div className="form-group">
                <label>Video File Path</label>
                <input
                  type="text"
                  className="input"
                  placeholder="/path/to/video.mp4"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Summary Style</label>
                <select
                  className="select"
                  value={textStyle}
                  onChange={(e) => setTextStyle(e.target.value)}
                >
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="bullet-points">Bullet Points</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={summarizeVideo}
                disabled={loading || !filePath.trim()}
              >
                {loading ? '⏳ Processing...' : '🎥 Summarize Video'}
              </button>

              {videoResult && (
                <div className="summary-result">
                  <h4>📊 Video Summary</h4>
                  <div className="summary-content">{videoResult.summary}</div>

                  {videoResult.key_points && videoResult.key_points.length > 0 && (
                    <>
                      <h4>🔑 Key Points</h4>
                      <ul className="key-points-list">
                        {videoResult.key_points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <details className="transcript-details">
                    <summary>📝 View Full Transcript</summary>
                    <div className="transcript-content">
                      {videoResult.transcript}
                    </div>
                  </details>

                  <div className="summary-meta">
                    <span>🌍 Language: {videoResult.language}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> Make sure to configure your OpenAI API key in AI Assistant settings
          </div>
        </div>
      </div>
    </div>
  );
}
