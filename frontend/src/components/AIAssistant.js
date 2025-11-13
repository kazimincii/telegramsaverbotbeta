import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function AIAssistant() {
  const { cfg } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState({ enabled: false, has_api_key: false });
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadAIConfig();
    loadSuggestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAIConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/config`);
      const data = await response.json();
      setAiConfig(data);

      if (!data.enabled || !data.has_api_key) {
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const context = JSON.stringify({
        recent_chats: cfg.chats || [],
        media_types: cfg.types || []
      });

      const response = await fetch(`${API_BASE}/api/ai/suggestions?context=${encodeURIComponent(context)}`);
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const saveAIConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          enabled: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setAiConfig({ enabled: true, has_api_key: true });
        setShowSettings(false);
        setApiKey('');
        addMessage('system', 'AI Assistant configured successfully!');
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);
      addMessage('error', `Failed to configure AI: ${error.message}`);
    }
  };

  const addMessage = (role, content, action = null, parameters = null) => {
    setMessages(prev => [...prev, {
      role,
      content,
      action,
      parameters,
      timestamp: new Date()
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    if (!aiConfig.enabled || !aiConfig.has_api_key) {
      addMessage('error', 'Please configure your OpenAI API key in settings first.');
      setShowSettings(true);
      return;
    }

    setLoading(true);

    try {
      const context = {
        current_config: cfg,
        recent_chats: cfg.chats || [],
        media_types: cfg.types || []
      };

      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context
        })
      });

      const data = await response.json();

      if (data.success) {
        addMessage('assistant', data.response, data.action, data.parameters);

        // If there's an action, show it to the user
        if (data.action) {
          addMessage('system', `Action detected: ${data.action}. Parameters: ${JSON.stringify(data.parameters)}`);
        }
      } else {
        addMessage('error', data.error || 'Failed to get response from AI');
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useSuggestion = (suggestion) => {
    setInput(suggestion);
  };

  const clearChat = async () => {
    try {
      await fetch(`${API_BASE}/api/ai/clear-history`, { method: 'POST' });
      setMessages([]);
      addMessage('system', 'Chat history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  return (
    <div className="ai-assistant-container">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">🤖 AI Chat Assistant</h3>
            <div className="card-description">
              {aiConfig.enabled ? 'Ask me anything about your Telegram archive!' : 'Configure AI to get started'}
            </div>
          </div>
          <div className="ai-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙️
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearChat}
              title="Clear Chat"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="card-body">
          {showSettings ? (
            <div className="ai-settings">
              <h4>AI Assistant Settings</h4>
              <p className="text-muted">
                Enter your OpenAI API key to enable AI features. Your key is stored locally and never shared.
              </p>

              <div className="form-group">
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="form-hint">
                  Get your API key from{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                    OpenAI Platform
                  </a>
                </div>
              </div>

              <div className="ai-settings-actions">
                <button
                  className="btn btn-primary"
                  onClick={saveAIConfig}
                  disabled={!apiKey.trim()}
                >
                  Save Configuration
                </button>
                {aiConfig.enabled && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div className="ai-chat-messages">
                {messages.length === 0 ? (
                  <div className="ai-welcome">
                    <div className="ai-welcome-icon">🤖</div>
                    <h4>Welcome to AI Assistant!</h4>
                    <p>I can help you with:</p>
                    <ul>
                      <li>Natural language commands for downloads</li>
                      <li>Smart search and filtering</li>
                      <li>Content summarization</li>
                      <li>Auto-tagging and organization</li>
                    </ul>
                    <p className="text-muted">Try asking me something or use a suggestion below!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`ai-message ai-message-${msg.role}`}
                    >
                      <div className="ai-message-avatar">
                        {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : '💡'}
                      </div>
                      <div className="ai-message-content">
                        <div className="ai-message-text">{msg.content}</div>
                        {msg.timestamp && (
                          <div className="ai-message-time">
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length === 0 && suggestions.length > 0 && (
                <div className="ai-suggestions">
                  <div className="ai-suggestions-label">Suggestions:</div>
                  <div className="ai-suggestions-list">
                    {suggestions.slice(0, 4).map((suggestion, index) => (
                      <button
                        key={index}
                        className="ai-suggestion-chip"
                        onClick={() => useSuggestion(suggestion)}
                      >
                        💡 {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="ai-input-container">
                <textarea
                  className="ai-input"
                  placeholder={aiConfig.enabled ? "Ask me anything..." : "Configure AI to start chatting"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!aiConfig.enabled || loading}
                  rows={2}
                />
                <button
                  className="btn btn-primary ai-send-button"
                  onClick={sendMessage}
                  disabled={!input.trim() || !aiConfig.enabled || loading}
                >
                  {loading ? '⏳' : '📤'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card-footer">
          <div className="text-small text-muted">
            💡 <strong>Tip:</strong> Try commands like "Download all images from this month" or "Find videos about cats"
          </div>
        </div>
      </div>
    </div>
  );
}
