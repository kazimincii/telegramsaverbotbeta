import React, { useState, useEffect, useRef } from 'react';
import './VoiceControl.css';

const API_BASE = 'http://localhost:8000';

// Available TTS languages
const TTS_LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'es', label: 'Español', flag: '🇪🇸' }
];

// TTS voice types
const TTS_VOICES = [
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'neutral', label: 'Neutral', icon: '🤖' }
];

const VoiceControl = () => {
  // State management
  const [activeTab, setActiveTab] = useState('control'); // control, commands, history, stats
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [commandResult, setCommandResult] = useState(null);

  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [ttsLanguage, setTtsLanguage] = useState('en');
  const [ttsVoice, setTtsVoice] = useState('female');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);

  // History and stats
  const [availableCommands, setAvailableCommands] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // Speech recognition ref
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadAvailableCommands();
    loadCommandHistory();
    loadStatistics();

    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        handleVoiceCommand(speechResult);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const loadAvailableCommands = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/voice/commands/available`);
      const data = await response.json();

      if (data.success) {
        setAvailableCommands(data.commands);
      }
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  };

  const loadCommandHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/voice/commands/history?limit=50`);
      const data = await response.json();

      if (data.success) {
        setCommandHistory(data.commands);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/voice/statistics`);
      const data = await response.json();

      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setCommandResult(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = async (text) => {
    try {
      const response = await fetch(`${API_BASE}/api/voice/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (data.success) {
        setCommandResult(data.result);
        await loadCommandHistory();
        await loadStatistics();

        // Speak the result
        if (data.result.result) {
          handleTextToSpeech(data.result.result);
        }
      }
    } catch (error) {
      console.error('Failed to process command:', error);
    }
  };

  const handleTextToSpeech = async (text = null) => {
    const textToSpeak = text || ttsText;

    if (!textToSpeak.trim()) {
      alert('Lütfen bir metin girin');
      return;
    }

    setIsSpeaking(true);

    try {
      const response = await fetch(`${API_BASE}/api/voice/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          language: ttsLanguage,
          voice: ttsVoice,
          speed: ttsSpeed
        })
      });

      const data = await response.json();

      if (data.success) {
        // In production, play the audio file
        // For now, use browser's speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = ttsLanguage;
          utterance.rate = ttsSpeed;

          // Select voice type
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(voice =>
            voice.lang.startsWith(ttsLanguage) &&
            (ttsVoice === 'female' ? voice.name.includes('Female') : true)
          );

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.onend = () => {
            setIsSpeaking(false);
          };

          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Failed to generate speech:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('tr-TR');
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.6) return '#ff9800';
    return '#f44336';
  };

  // Render control tab
  const renderControl = () => (
    <div className="control-section">
      <div className="voice-input-card">
        <h3>🎤 Sesli Komut</h3>

        <div className="microphone-container">
          <button
            className={`mic-button ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={!recognitionRef.current}
          >
            <span className="mic-icon">🎤</span>
            {isListening ? 'Dinleniyor...' : 'Dinlemeye Başla'}
          </button>

          {!recognitionRef.current && (
            <p className="browser-warning">
              ⚠️ Tarayıcınız ses tanımayı desteklemiyor
            </p>
          )}
        </div>

        {transcript && (
          <div className="transcript-box">
            <h4>Algılanan:</h4>
            <p>{transcript}</p>
          </div>
        )}

        {commandResult && (
          <div className="command-result">
            <h4>Komut Sonucu:</h4>
            <div className="result-details">
              <div className="result-item">
                <span className="label">Komut:</span>
                <span className="value">{commandResult.command}</span>
              </div>
              <div className="result-item">
                <span className="label">Güven:</span>
                <span
                  className="value"
                  style={{ color: getConfidenceColor(commandResult.confidence) }}
                >
                  {(commandResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="result-item">
                <span className="label">Durum:</span>
                <span className={`value ${commandResult.executed ? 'success' : 'failure'}`}>
                  {commandResult.executed ? '✓ Başarılı' : '✗ Başarısız'}
                </span>
              </div>
              {commandResult.result && (
                <div className="result-message">
                  {commandResult.result}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="tts-card">
        <h3>🔊 Text-to-Speech</h3>

        <div className="form-group">
          <label>Metin</label>
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="Seslendirilecek metni girin..."
            rows={4}
          />
        </div>

        <div className="tts-options">
          <div className="form-group">
            <label>Dil</label>
            <select value={ttsLanguage} onChange={(e) => setTtsLanguage(e.target.value)}>
              {TTS_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ses</label>
            <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
              {TTS_VOICES.map(voice => (
                <option key={voice.value} value={voice.value}>
                  {voice.icon} {voice.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Hız: {ttsSpeed.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={ttsSpeed}
              onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="tts-buttons">
          <button
            className="btn-primary"
            onClick={() => handleTextToSpeech()}
            disabled={isSpeaking}
          >
            {isSpeaking ? '🔊 Konuşuyor...' : '▶️ Seslendir'}
          </button>
          {isSpeaking && (
            <button className="btn-secondary" onClick={stopSpeaking}>
              ⏹️ Durdur
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render commands tab
  const renderCommands = () => (
    <div className="commands-section">
      <div className="section-header">
        <h3>Mevcut Komutlar</h3>
      </div>

      <div className="commands-grid">
        {availableCommands.map((cmd, index) => (
          <div key={index} className="command-card">
            <h4>{cmd.name}</h4>
            <div className="command-examples">
              <p className="examples-label">Örnekler:</p>
              <ul>
                {cmd.examples.map((example, i) => (
                  <li key={i}>&ldquo;{example}&rdquo;</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render history tab
  const renderHistory = () => (
    <div className="history-section">
      <div className="section-header">
        <h3>Komut Geçmişi</h3>
        <button className="btn-secondary" onClick={loadCommandHistory}>
          🔄 Yenile
        </button>
      </div>

      <div className="history-list">
        {commandHistory.length === 0 ? (
          <div className="empty-state">
            <p>Henüz komut geçmişi yok</p>
          </div>
        ) : (
          commandHistory.map(cmd => (
            <div key={cmd.id} className="history-item">
              <div className="history-header">
                <span className="history-command">{cmd.command}</span>
                <span className="history-time">{formatDate(cmd.timestamp)}</span>
              </div>
              <div className="history-text">&ldquo;{cmd.original_text}&rdquo;</div>
              <div className="history-meta">
                <span
                  className="confidence"
                  style={{ color: getConfidenceColor(cmd.confidence) }}
                >
                  Güven: {(cmd.confidence * 100).toFixed(1)}%
                </span>
                <span className={`status ${cmd.executed ? 'success' : 'failure'}`}>
                  {cmd.executed ? '✓ Başarılı' : '✗ Başarısız'}
                </span>
              </div>
              {cmd.result && (
                <div className="history-result">{cmd.result}</div>
              )}
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
            <div className="stat-icon">🎤</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_commands}</div>
              <div className="stat-label">Toplam Komut</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.executed_commands}</div>
              <div className="stat-label">Başarılı</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✗</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.failed_commands}</div>
              <div className="stat-label">Başarısız</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{(statistics.avg_confidence * 100).toFixed(1)}%</div>
              <div className="stat-label">Ort. Güven</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_tts_requests}</div>
              <div className="stat-label">TTS İstekleri</div>
            </div>
          </div>
        </div>

        {Object.keys(statistics.by_command).length > 0 && (
          <div className="command-breakdown">
            <h4>Komutlara Göre Dağılım</h4>
            <div className="breakdown-list">
              {Object.entries(statistics.by_command).map(([cmd, count]) => (
                <div key={cmd} className="breakdown-item">
                  <span className="breakdown-label">{cmd}</span>
                  <span className="breakdown-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="voice-control">
      <div className="voice-header">
        <h2>Sesli Kontrol</h2>
      </div>

      <div className="voice-tabs">
        <button
          className={`tab-button ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          🎤 Kontrol
        </button>
        <button
          className={`tab-button ${activeTab === 'commands' ? 'active' : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          📋 Komutlar
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Geçmiş
        </button>
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 İstatistikler
        </button>
      </div>

      <div className="voice-content">
        {activeTab === 'control' && renderControl()}
        {activeTab === 'commands' && renderCommands()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'stats' && renderStatistics()}
      </div>
    </div>
  );
};

export default VoiceControl;
