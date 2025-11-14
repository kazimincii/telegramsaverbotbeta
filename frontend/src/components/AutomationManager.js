import React, { useState, useEffect } from 'react';
import './AutomationManager.css';

const API_BASE = 'http://localhost:8000';

// Available trigger types
const TRIGGER_TYPES = [
  { value: 'schedule', label: 'Zamanlama', icon: '⏰' },
  { value: 'event', label: 'Olay', icon: '⚡' },
  { value: 'condition', label: 'Koşul', icon: '🎯' },
  { value: 'manual', label: 'Manuel', icon: '🖱️' }
];

// Available action types
const ACTION_TYPES = [
  { value: 'download', label: 'İndir', icon: '📥' },
  { value: 'upload', label: 'Yükle', icon: '📤' },
  { value: 'move', label: 'Taşı', icon: '📦' },
  { value: 'delete', label: 'Sil', icon: '🗑️' },
  { value: 'tag', label: 'Etiketle', icon: '🏷️' },
  { value: 'notify', label: 'Bildir', icon: '🔔' },
  { value: 'script', label: 'Script Çalıştır', icon: '📜' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' }
];

// Schedule types
const SCHEDULE_TYPES = [
  { value: 'once', label: 'Bir Kez' },
  { value: 'hourly', label: 'Saatlik' },
  { value: 'daily', label: 'Günlük' },
  { value: 'weekly', label: 'Haftalık' },
  { value: 'monthly', label: 'Aylık' }
];

const AutomationManager = () => {
  // State management
  const [activeTab, setActiveTab] = useState('rules'); // rules, logs, scripts
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rule editor state
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [triggerType, setTriggerType] = useState('schedule');
  const [scheduleType, setScheduleType] = useState('daily');
  const [actions, setActions] = useState([]);
  const [conditions, setConditions] = useState([]);

  // Script editor state
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptContent, setScriptContent] = useState('');

  // Load data on mount
  useEffect(() => {
    loadRules();
    loadLogs();
    loadScripts();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/automation/rules`);
      const data = await response.json();

      if (data.success) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/logs?limit=100`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const loadScripts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/scripts`);
      const data = await response.json();

      if (data.success) {
        setScripts(data.scripts);
      }
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDescription('');
    setTriggerType('schedule');
    setScheduleType('daily');
    setActions([]);
    setConditions([]);
    setShowRuleEditor(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setTriggerType(rule.trigger_type);
    setScheduleType(rule.trigger_config.schedule_type || 'daily');
    setActions(rule.actions || []);
    setConditions(rule.conditions || []);
    setShowRuleEditor(true);
  };

  const handleSaveRule = async () => {
    const ruleData = {
      name: ruleName,
      description: ruleDescription,
      trigger_type: triggerType,
      trigger_config: {
        schedule_type: scheduleType
      },
      actions: actions,
      conditions: conditions
    };

    try {
      let response;

      if (editingRule) {
        // Update existing rule
        response = await fetch(`${API_BASE}/api/automation/rule/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleData)
        });
      } else {
        // Create new rule
        response = await fetch(`${API_BASE}/api/automation/rule/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleData)
        });
      }

      const data = await response.json();

      if (data.success) {
        setShowRuleEditor(false);
        await loadRules();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('Kural kaydedilemedi');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Bu kuralı silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/automation/rule/${ruleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await loadRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/rule/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled })
      });

      const data = await response.json();

      if (data.success) {
        await loadRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleExecuteRule = async (ruleId) => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/rule/${ruleId}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        alert('Kural başarıyla çalıştırıldı!');
        await loadLogs();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to execute rule:', error);
      alert('Kural çalıştırılamadı');
    }
  };

  const handleAddAction = () => {
    setActions([...actions, { type: 'download', config: {} }]);
  };

  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleUpdateAction = (index, field, value) => {
    const newActions = [...actions];
    if (field === 'type') {
      newActions[index].type = value;
      newActions[index].config = {};
    } else {
      newActions[index].config[field] = value;
    }
    setActions(newActions);
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { type: 'time_range', config: {} }]);
  };

  const handleRemoveCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSaveScript = async () => {
    if (!scriptName.endsWith('.py')) {
      alert('Script adı .py ile bitmelidir');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/automation/script/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scriptName,
          content: scriptContent
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowScriptEditor(false);
        setScriptName('');
        setScriptContent('');
        await loadScripts();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save script:', error);
      alert('Script kaydedilemedi');
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('tr-TR');
  };

  const getStatusColor = (status) => {
    const colors = {
      success: '#4caf50',
      failure: '#f44336',
      partial: '#ff9800'
    };
    return colors[status] || '#999';
  };

  // Render rules tab
  const renderRules = () => (
    <div className="rules-section">
      <div className="section-header">
        <h3>Otomasyon Kuralları</h3>
        <button className="btn-primary" onClick={handleCreateRule}>
          + Yeni Kural
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="empty-state">
          <p>Henüz hiç kural oluşturulmamış. Başlamak için yeni bir kural ekleyin!</p>
        </div>
      ) : (
        <div className="rules-grid">
          {rules.map(rule => (
            <div key={rule.id} className={`rule-card ${!rule.enabled ? 'disabled' : ''}`}>
              <div className="rule-header">
                <div className="rule-info">
                  <h4>{rule.name}</h4>
                  <p>{rule.description}</p>
                </div>
                <div className="rule-status">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="rule-details">
                <div className="detail-item">
                  <span className="detail-icon">
                    {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.icon}
                  </span>
                  <span className="detail-text">
                    {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">⚡</span>
                  <span className="detail-text">{rule.actions.length} eylem</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">📊</span>
                  <span className="detail-text">{rule.run_count} çalıştırma</span>
                </div>
              </div>

              {rule.last_run && (
                <div className="rule-last-run">
                  Son çalıştırma: {formatDate(rule.last_run)}
                </div>
              )}

              <div className="rule-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleExecuteRule(rule.id)}
                  title="Şimdi Çalıştır"
                >
                  ▶️
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleEditRule(rule)}
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteRule(rule.id)}
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render logs tab
  const renderLogs = () => (
    <div className="logs-section">
      <div className="section-header">
        <h3>Çalıştırma Logları</h3>
        <button className="btn-secondary" onClick={loadLogs}>
          🔄 Yenile
        </button>
      </div>

      <div className="logs-list">
        {logs.length === 0 ? (
          <div className="empty-state">
            <p>Henüz hiç log kaydı yok</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="log-item">
              <div
                className="log-status-indicator"
                style={{ backgroundColor: getStatusColor(log.status) }}
              />
              <div className="log-content">
                <div className="log-header">
                  <span className="log-rule">
                    {rules.find(r => r.id === log.rule_id)?.name || 'Unknown Rule'}
                  </span>
                  <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                </div>
                <div className="log-message">{log.message}</div>
                {log.details && log.details.results && (
                  <div className="log-details">
                    {log.details.results.map((result, index) => (
                      <div key={index} className="result-item">
                        <span className={result.success ? 'success' : 'failure'}>
                          {result.success ? '✓' : '✗'}
                        </span>
                        <span>{result.action || 'Action'}</span>
                        {result.error && <span className="error-text">- {result.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render scripts tab
  const renderScripts = () => (
    <div className="scripts-section">
      <div className="section-header">
        <h3>Özel Scriptler</h3>
        <button className="btn-primary" onClick={() => {
          setScriptName('');
          setScriptContent('#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\n# Your automation script here\n');
          setShowScriptEditor(true);
        }}>
          + Yeni Script
        </button>
      </div>

      <div className="scripts-grid">
        {scripts.length === 0 ? (
          <div className="empty-state">
            <p>Henüz hiç script oluşturulmamış</p>
          </div>
        ) : (
          scripts.map((script, index) => (
            <div key={index} className="script-card">
              <div className="script-icon">📜</div>
              <div className="script-info">
                <h4>{script.name}</h4>
                <div className="script-meta">
                  <span>Boyut: {(script.size / 1024).toFixed(2)} KB</span>
                  <span>Güncelleme: {formatDate(script.modified)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render action configurator
  const renderActionConfig = (action, index) => {
    const actionType = action.type;

    return (
      <div key={index} className="action-config">
        <div className="action-header">
          <select
            value={actionType}
            onChange={(e) => handleUpdateAction(index, 'type', e.target.value)}
            className="action-type-select"
          >
            {ACTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
          <button
            className="btn-icon btn-danger"
            onClick={() => handleRemoveAction(index)}
          >
            ✖
          </button>
        </div>

        <div className="action-fields">
          {actionType === 'download' && (
            <>
              <input
                type="text"
                placeholder="URL"
                value={action.config.url || ''}
                onChange={(e) => handleUpdateAction(index, 'url', e.target.value)}
              />
              <input
                type="text"
                placeholder="Hedef Klasör"
                value={action.config.destination || ''}
                onChange={(e) => handleUpdateAction(index, 'destination', e.target.value)}
              />
            </>
          )}

          {actionType === 'move' && (
            <>
              <input
                type="text"
                placeholder="Kaynak"
                value={action.config.source || ''}
                onChange={(e) => handleUpdateAction(index, 'source', e.target.value)}
              />
              <input
                type="text"
                placeholder="Hedef"
                value={action.config.destination || ''}
                onChange={(e) => handleUpdateAction(index, 'destination', e.target.value)}
              />
            </>
          )}

          {actionType === 'delete' && (
            <input
              type="text"
              placeholder="Dosya Yolu veya Pattern"
              value={action.config.path || action.config.pattern || ''}
              onChange={(e) => handleUpdateAction(index, 'path', e.target.value)}
            />
          )}

          {actionType === 'tag' && (
            <>
              <input
                type="text"
                placeholder="Dosyalar (virgülle ayırın)"
                value={action.config.files?.join(',') || ''}
                onChange={(e) => handleUpdateAction(index, 'files', e.target.value.split(','))}
              />
              <input
                type="text"
                placeholder="Etiketler (virgülle ayırın)"
                value={action.config.tags?.join(',') || ''}
                onChange={(e) => handleUpdateAction(index, 'tags', e.target.value.split(','))}
              />
            </>
          )}

          {actionType === 'notify' && (
            <>
              <input
                type="text"
                placeholder="Başlık"
                value={action.config.title || ''}
                onChange={(e) => handleUpdateAction(index, 'title', e.target.value)}
              />
              <input
                type="text"
                placeholder="Mesaj"
                value={action.config.message || ''}
                onChange={(e) => handleUpdateAction(index, 'message', e.target.value)}
              />
            </>
          )}

          {actionType === 'script' && (
            <select
              value={action.config.script || ''}
              onChange={(e) => handleUpdateAction(index, 'script', e.target.value)}
            >
              <option value="">Script Seçin</option>
              {scripts.map(script => (
                <option key={script.name} value={script.name}>
                  {script.name}
                </option>
              ))}
            </select>
          )}

          {actionType === 'webhook' && (
            <>
              <input
                type="text"
                placeholder="Webhook URL"
                value={action.config.url || ''}
                onChange={(e) => handleUpdateAction(index, 'url', e.target.value)}
              />
              <select
                value={action.config.method || 'POST'}
                onChange={(e) => handleUpdateAction(index, 'method', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="automation-manager">
      <div className="automation-header">
        <h2>Otomasyon & Scripting</h2>
      </div>

      <div className="automation-tabs">
        <button
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          ⚙️ Kurallar
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Loglar
        </button>
        <button
          className={`tab-button ${activeTab === 'scripts' ? 'active' : ''}`}
          onClick={() => setActiveTab('scripts')}
        >
          📜 Scriptler
        </button>
      </div>

      <div className="automation-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        ) : (
          <>
            {activeTab === 'rules' && renderRules()}
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'scripts' && renderScripts()}
          </>
        )}
      </div>

      {/* Rule Editor Modal */}
      {showRuleEditor && (
        <div className="modal-overlay" onClick={() => setShowRuleEditor(false)}>
          <div className="modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRule ? 'Kuralı Düzenle' : 'Yeni Kural Oluştur'}</h3>

            <div className="form-group">
              <label>Kural Adı *</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Otomatik İndirme"
              />
            </div>

            <div className="form-group">
              <label>Açıklama</label>
              <textarea
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Bu kural ne yapar?"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Tetikleyici Türü *</label>
              <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                {TRIGGER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {triggerType === 'schedule' && (
              <div className="form-group">
                <label>Zamanlama Türü *</label>
                <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                  {SCHEDULE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Eylemler *</label>
              {actions.map((action, index) => renderActionConfig(action, index))}
              <button className="btn-secondary" onClick={handleAddAction}>
                + Eylem Ekle
              </button>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowRuleEditor(false)}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleSaveRule}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Editor Modal */}
      {showScriptEditor && (
        <div className="modal-overlay" onClick={() => setShowScriptEditor(false)}>
          <div className="modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Yeni Script Oluştur</h3>

            <div className="form-group">
              <label>Script Adı (*.py) *</label>
              <input
                type="text"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                placeholder="my_script.py"
              />
            </div>

            <div className="form-group">
              <label>Script İçeriği *</label>
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={15}
                className="code-editor"
                spellCheck={false}
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowScriptEditor(false)}>
                İptal
              </button>
              <button className="btn-primary" onClick={handleSaveScript}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationManager;
