import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function SettingsForm(){
  const { cfg, setField, save } = useContext(AppContext);
  const [dialogs, setDialogs] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchDialogs().then(r => {
      if (!alive) return;
      if (r.ok && Array.isArray(r.data)) setDialogs(r.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
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
        <label style={{fontSize:12,color:'#555'}}>Kanallar</label>
        <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:200,overflowY:'auto',border:'1px solid #d0d0d0',padding:8,borderRadius:10}}>
          {dialogs.map(d => (
            <label key={d.id} style={{display:'flex',alignItems:'center',gap:6}}>
              <input
                type="checkbox"
                checked={(cfg.chats || []).map(String).includes(String(d.id))}
                onChange={e => {
                  const set = new Set((cfg.chats || []).map(String));
                  const id = String(d.id);
                  if (e.target.checked) set.add(id); else set.delete(id);
                  setField('chats', Array.from(set));
                }}
              />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'center',marginTop:12,flexWrap:'wrap'}}>
        {['photos','videos','documents'].map(t=> (
          <label key={t} style={{display:'inline-flex',gap:6,alignItems:'center'}}>
            <input type="checkbox" checked={(cfg.types||[]).includes(t)} onChange={(e)=>{const s=new Set(cfg.types||[]); if(e.target.checked)s.add(t); else s.delete(t); setField('types',Array.from(s));}}/>
            <span>{t}</span>
          </label>
        ))}
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}>
          <input type="checkbox" checked={!!cfg.dry_run} onChange={(e)=>setField('dry_run',e.target.checked)}/>
          <span>Dry-run</span>
        </label>
        <div style={{marginLeft:'auto'}}><button onClick={save}>Kaydet</button></div>
      </div>
    </>
  );
}
