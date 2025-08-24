import React, { createContext, useEffect, useState } from 'react';
import { fetchConfig, saveConfig, startRun, stopRun, fetchStatus } from '../services/api';

export const AppContext = createContext();

const defaultCfg = { api_id:"", api_hash:"", session:"tg_media", out:"C:/TelegramArchive", types:["photos"], channels:[], include:[], exclude:[], min_date:"", max_date:"", throttle:0.2, concurrency:3, dry_run:false };

export function AppProvider({ children }) {
  const [cfg,setCfg] = useState(defaultCfg);
  const [running,setRunning] = useState(false);
  const [log,setLog] = useState([]);
  const [progress,setProgress] = useState(null);

  const setField = (k,v)=>setCfg(c=>({...c,[k]:v}));
  const clearLog = ()=>setLog([]);

 codex/split-components-into-frontend/src/components
  async function save(){ await saveConfig(cfg); }
  async function start(dry){ await startRun(cfg, dry); }
  async function stop(){ await stopRun(); }

  async function save(){ await postJSON('/api/config',cfg); }
  async function start(dry){ await postJSON('/api/config',{...cfg,dry_run:dry}); await postJSON('/api/start',{ channels: cfg.channels, media_types: cfg.types }); }
  async function stop(){ await postJSON('/api/stop',{}); }
 main

  useEffect(()=>{ fetchConfig().then(r=>{ if(r.ok && r.data) setCfg(o=>({...o,...r.data})); }); },[]);

  useEffect(()=>{ let alive=true; const tick=()=>fetchStatus().then(r=>{ if(!alive)return; const s=r.data||{}; setRunning(!!s.running); setProgress(s.progress||null); if(Array.isArray(s.logTail)) setLog(p=>[...p,...s.logTail].slice(-400)); }).finally(()=>{ if(alive) setTimeout(tick,1500);}); tick(); return ()=>{alive=false}; },[]);

  return (
    <AppContext.Provider value={{cfg,setField,save,start,stop,running,progress,log,clearLog}}>
      {children}
    </AppContext.Provider>
  );
}
