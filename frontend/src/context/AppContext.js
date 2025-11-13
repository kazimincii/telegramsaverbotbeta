import React, { createContext, useEffect, useState, useRef } from 'react';
import { fetchConfig, saveConfig, startRun, stopRun, fetchStatus } from '../services/api';
import notificationService from '../services/notificationService';

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

  // Track previous state for notification triggers
  const prevRunning = useRef(false);
  const prevProgress = useRef(defaultProgress);

  const setField = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const clearLog = () => setLog([]);
  const clearErrors = () => setErrors([]);

  const recordError = (msg) => {
    setError(msg);
    if (msg) {
      setErrors(prev => [...prev, msg]);
      // Show error notification
      notificationService.notifyDownloadError({ message: msg });
    }
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
          const isRunning = !!d.running;
          const newProgress = d.progress || defaultProgress;

          // Check if download just completed
          if (prevRunning.current && !isRunning) {
            // Download finished
            notificationService.notifyDownloadComplete({
              count: prevProgress.current.downloaded || 0,
              chat: prevProgress.current.chat || 'Unknown',
              folder: cfg.out
            });
          }

          // Check if download is in progress and downloaded count increased
          if (isRunning && newProgress.downloaded > prevProgress.current.downloaded) {
            notificationService.notifyDownloadProgress({
              downloaded: newProgress.downloaded,
              chat: newProgress.chat
            });
          }

          // Update state
          setRunning(isRunning);
          setProgress(newProgress);
          if (Array.isArray(d.logTail)) setLog(p => [...p, ...d.logTail].slice(-400));

          // Update refs
          prevRunning.current = isRunning;
          prevProgress.current = newProgress;
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
  }, [cfg.out]);

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
