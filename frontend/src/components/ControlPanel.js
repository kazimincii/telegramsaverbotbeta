 codex/update-getjson-and-postjson-to-buildurl
import React, {useEffect,useMemo,useState} from "react";

const RAW_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const API_BASE = RAW_BASE.trim().replace(/\/+$/, ""); // boşluğu ve sonda kalan / işaretlerini at
const buildUrl = (p) => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

function headers(){ return {"Content-Type":"application/json"}; }
async function getJSON(p){ const r=await fetch(buildUrl(p),{headers:headers()}); const t=await r.text(); try{return {ok:r.ok,data:t?JSON.parse(t):{}}}catch{return {ok:r.ok,data:{}}} }
async function postJSON(p,b){ const r=await fetch(buildUrl(p),{method:"POST",headers:headers(),body:JSON.stringify(b||{})}); const t=await r.text(); try{return {ok:r.ok,data:t?JSON.parse(t):{}}}catch{return {ok:r.ok,data:{}}} }
 codex/refactor-api-calls-in-controlpanel.js


import React from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
 main
 main

export default function ControlPanel(){
 codex/gelistir-bot-arayuzunu-basit-hale-getir
  const [cfg,setCfg]=useState({api_id:"",api_hash:"",session:"tg_media",out:"C:/TelegramArchive",types:["photos"],include:[],exclude:[],chats:[],min_date:"",max_date:"",throttle:0.2,concurrency:3,dry_run:false});

 codex/add-filters-to-download_worker-function
  const [cfg,setCfg]=useState({api_id:"",api_hash:"",session:"tg_media",out:"C:/TelegramArchive",types:["photos"],include:[],exclude:[],min_date:"",max_date:"",throttle:0.2,concurrency:3,dry_run:false,channels:[]});
 main
  const [running,setRunning]=useState(false);
  const [log,setLog]=useState([]);
  const [error,setError]=useState("");
  const [progress,setProgress]=useState(null);
  const [dialogs,setDialogs]=useState([]);
  const valid=useMemo(()=>cfg.api_id && cfg.api_hash && cfg.out,[cfg]);

  useEffect(()=>{getJSON("/api/config").then(r=>{ if(r.ok && r.data) setCfg(o=>({...o,...r.data})) });},[]);
  useEffect(()=>{ let alive=true; const tick=()=>getJSON("/api/status").then(r=>{ if(!alive)return; const s=r.data||{}; setRunning(!!s.running); setProgress(s.progress||null); if(Array.isArray(s.logTail)) setLog(p=>[...p,...s.logTail].slice(-400)); }).finally(()=>{ if(alive) setTimeout(tick, 1500);}); tick(); return()=>{alive=false} },[]);
  useEffect(()=>{getJSON("/api/dialogs").then(r=>{ if(r.ok && Array.isArray(r.data.dialogs)) setDialogs(r.data.dialogs); });},[]);

  const setField=(k,v)=>setCfg(c=>({...c,[k]:v}));
  async function save(){ setError(""); const r=await postJSON("/api/config",cfg); if(!r.ok) setError("Kaydetme hatasi"); }
  async function start(dry){
    setError("");
    if(typeof dry==="boolean") await postJSON("/api/config",{...cfg,dry_run:dry});
    const r=await postJSON("/api/start",{channels:cfg.channels,media_types:cfg.types});
    if(!r.ok) setError("Baslatma hatasi");
  }
  async function stop(){ setError(""); const r=await postJSON("/api/stop",{}); if(!r.ok) setError("Durdurma hatasi"); }

  return (<div style={{maxWidth:1100,margin:"24px auto",padding:"0 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <h1 style={{fontSize:22,margin:0}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{padding:"6px 10px",borderRadius:999,fontSize:12,background:running?"#e9f7ee":"#e9ecef"}}>
          <span style={{display:"inline-block",width:8,height:8,borderRadius:999,background:running?"#2ecc71":"#6c757d",marginRight:6}}/> {running?"Çalışıyor":"Beklemede"}
        </span>
        <button onClick={stop}>Durdur</button>
        <button onClick={()=>start(false)} disabled={!valid} style={{background:'#111',color:'#fff',border:'1px solid #111',borderRadius:10,padding:"8px 14px"}}>Başlat</button>
        <button onClick={()=>start(true)}>Dry-Run</button>
      </div>
    </div>

    {error && <div style={{background:'#f8d7da',border:'1px solid #f5c2c7',borderRadius:10,padding:10,marginBottom:12}}>{error}</div>}

    <div style={{display:'grid',gap:12,gridTemplateColumns:'1.3fr 1fr 1fr 1fr'}}>
      <div><label style={{fontSize:12,color:'#555'}}>API ID</label><input value={cfg.api_id} onChange={e=>setField('api_id',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/></div>
      <div><label style={{fontSize:12,color:'#555'}}>API HASH</label><input value={cfg.api_hash} onChange={e=>setField('api_hash',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/></div>
      <div><label style={{fontSize:12,color:'#555'}}>Session</label><input value={cfg.session} onChange={e=>setField('session',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/></div>
      <div><label style={{fontSize:12,color:'#555'}}>Çıkış klasörü</label><input value={cfg.out} onChange={e=>setField('out',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/></div>
    </div>

    <div style={{display:'grid',gap:12,gridTemplateColumns:'1fr 1fr',marginTop:12}}>
      <div><label style={{fontSize:12,color:'#555'}}>Min Tarih</label><input type="date" value={cfg.min_date||""} onChange={e=>setField('min_date',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/></div>
      <div><label style={{fontSize:12,color:'#555'}}>Max Tarih</label><input type="date" value={cfg.max_date||""} onChange={e=>setField('max_date',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/></div>
    </div>

    <div style={{marginTop:12}}>
      <label style={{fontSize:12,color:'#555'}}>Kanallar (ID, virgülle)</label>
      <input value={(cfg.channels||[]).join(',')} onChange={e=>setField('channels',e.target.value.split(',').map(s=>parseInt(s.trim())).filter(n=>!isNaN(n)))} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/>
    </div>

    <div style={{display:'flex',gap:16,alignItems:'center',marginTop:12,flexWrap:'wrap'}}>
      {['photos','videos','documents'].map(t=> (<label key={t} style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={(cfg.types||[]).includes(t)} onChange={(e)=>{const s=new Set(cfg.types||[]); if(e.target.checked)s.add(t); else s.delete(t); setField('types',Array.from(s));}}/><span>{t}</span></label>))}
      <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={!!cfg.dry_run} onChange={(e)=>setField('dry_run',e.target.checked)}/><span>Dry-run</span></label>
      <div style={{marginLeft:'auto'}}><button onClick={save}>Kaydet</button></div>
    </div>

    <div style={{marginTop:16}}>
      <div style={{fontSize:12,color:'#555',marginBottom:6}}>Gruplar</div>
      <div style={{maxHeight:200,overflow:'auto',border:'1px solid #e7e7e7',borderRadius:10,padding:8,display:'flex',flexDirection:'column',gap:4}}>
        {dialogs.length? dialogs.map(d=>(
          <label key={d.id} style={{display:'flex',gap:6,alignItems:'center'}}>
            <input type="checkbox" checked={(cfg.chats||[]).includes(d.id)} onChange={(e)=>{const s=new Set(cfg.chats||[]); if(e.target.checked)s.add(d.id); else s.delete(d.id); setField('chats',Array.from(s));}}/>
            <span>{d.name}</span>
          </label>
        )) : <div style={{fontSize:12,color:'#999'}}>Sohbet bulunamadı</div>}
      </div>
    </div>

    <div style={{marginTop:16}}>
      <div style={{fontSize:12,color:'#555',marginBottom:6}}>Durum</div>
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',columnGap:8,rowGap:6,fontSize:14}}>
        <div>Çalışma:</div><div>{running?"Evet":"Hayır"}</div>
        <div>Sohbet:</div><div>{progress?.chat||"-"}</div>
        <div>İndirilen:</div><div>{progress?.downloaded??0}</div>
        <div>Atlanan:</div><div>{progress?.skipped??0}</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <button onClick={()=>setLog([])}>Logları Temizle</button>
        <button onClick={()=>navigator.clipboard.writeText((log||[]).join("\n"))}>Kopyala</button>
      </div>
      <pre style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',fontSize:12,background:'#fafafa',border:'1px solid #e7e7e7',borderRadius:10,padding:10,height:340,overflow:'auto',whiteSpace:'pre-wrap',marginTop:8}}>{(log&&log.length)?log.join("\n"):"Log bekleniyor..."}</pre>
    </div>
  </div>);

  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:'0 16px'}}>
      <h1 style={{fontSize:22,marginBottom:12}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      <SettingsForm />
      <StatusPanel />
      <LogViewer />
    </div>
  );
 main
}
