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
    try {
      await saveConfig(cfg);
    } catch (e) {
      recordError(e.message || 'Kaydetme hatası');
      throw e;
    }
  }

  async function start(dry) {
    recordError('');
    try {
      await startRun(cfg, dry, cfg.chats);
    } catch (e) {
      recordError(e.message || 'Başlatma hatası');
      throw e;
    }
  }

  async function stop() {
    recordError('');
    try {
      await stopRun();
    } catch (e) {
      recordError(e.message || 'Durdurma hatası');
      throw e;
    }
  }

  useEffect(() => {
    fetchConfig()
      .then(data => {
        if (data) setCfg(o => ({ ...o, ...data }));
      })
      .catch(e => recordError(e.message || 'Config alınamadı'));
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      fetchStatus()
        .then(s => {
          if (!alive) return;
          const d = s || {};
          setRunning(!!d.running);
          setProgress(d.progress || defaultProgress);
          if (Array.isArray(d.logTail)) setLog(p => [...p, ...d.logTail].slice(-400));
        })
        .catch(e => {
          if (alive) recordError(e.message || 'Durum alınamadı');
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
