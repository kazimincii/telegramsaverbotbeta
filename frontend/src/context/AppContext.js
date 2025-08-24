import React, { createContext, useEffect, useState } from 'react';
import { fetchConfig, saveConfig, startRun, stopRun, fetchStatus } from '../services/api';

// Global application context used by the control panel components
export const AppContext = createContext();

const defaultCfg = {
  api_id: '',
  api_hash: '',
  session: 'tg_media',
  out: 'C:/TelegramArchive',
  types: ['photos'],
  chats: [],
  include: [],
  exclude: [],
  min_date: '',
  max_date: '',
  throttle: 0.2,
  concurrency: 3,
  dry_run: false,
};

const defaultProgress = { chat: '', downloaded: 0, skipped: 0 };

export function AppProvider({ children }) {
  const [cfg, setCfg] = useState(defaultCfg);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState(defaultProgress);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [dialogs, setDialogs] = useState([]);

  const setField = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const clearLog = () => setLog([]);
  const clearErrors = () => setErrors([]);

  const recordError = (msg) => {
    setError(msg);
    if (msg) setErrors(prev => [...prev, msg]);
  };

  async function save() {
    recordError('');
    const r = await saveConfig(cfg);
    if (!r.ok) recordError(r.error?.message || 'Kaydetme hatası');
  }

  async function start(dry) {
    recordError('');
    const r = await startRun(cfg, dry, cfg.chats);
    if (!r.ok) recordError(r.error?.message || 'Başlatma hatası');
  }

  async function stop() {
    recordError('');
    const r = await stopRun();
    if (!r.ok) recordError(r.error?.message || 'Durdurma hatası');
  }

  useEffect(() => {
    fetchConfig().then(r => {
      if (r.ok && r.data) setCfg(o => ({ ...o, ...r.data }));
      else if (r.error) recordError(r.error.message || 'Config alınamadı');
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      fetchStatus()
        .then(r => {
          if (!alive) return;
          if (r.ok) {
            const s = r.data || {};
            setRunning(!!s.running);
            setProgress(s.progress || defaultProgress);
            if (Array.isArray(s.logTail)) setLog(p => [...p, ...s.logTail].slice(-400));
          } else if (r.error) {
            recordError(r.error.message || 'Durum alınamadı');
          }
        })
        .finally(() => {
          if (alive) setTimeout(tick, 1500);
        });
    tick();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        cfg,
        setField,
        save,
        start,
        stop,
        running,
        progress,
        log,
        clearLog,
        error,
        errors,
        clearErrors,
        dialogs,
        setDialogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
