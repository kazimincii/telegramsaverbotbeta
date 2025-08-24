import React, { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';
import Panel from './Panel';
import MinimalButton from './MinimalButton';
import saveIcon from '../assets/save.svg';

export default function SettingsForm() {
  const { cfg, setField, save, dialogs, setDialogs } = useContext(AppContext);

  useEffect(() => {
    let alive = true;
    fetchDialogs().then(r => {
      if (!alive) return;
      if (r.ok && Array.isArray(r.data)) setDialogs(r.data);
    });
    return () => {
      alive = false;
    };
  }, [setDialogs]);

  return (
    <Panel>
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
        <label style={{fontSize:12,color:'#555',display:'block',marginBottom:4}}>Kanallar</label>
        <div style={{maxHeight:200,overflowY:'auto',border:'1px solid #d0d0d0',borderRadius:10,padding:8,display:'flex',flexDirection:'column',gap:4}}>
          {dialogs.map(d => {
            const idStr = String(d.id);
            const selected = (cfg.chats || []).map(String).includes(idStr);
            return (
              <label key={idStr} style={{display:'flex',gap:6,alignItems:'center'}}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={e=>{
                    const s = new Set((cfg.chats || []).map(String));
                    if (e.target.checked) s.add(idStr); else s.delete(idStr);
                    setField('chats', Array.from(s));
                  }}
                />
                <span>{d.name}</span>
              </label>
            );
          })}
          {dialogs.length === 0 && (
            <div style={{fontSize:12,color:'#999'}}>Kanal bulunamadı</div>
          )}
        </div>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'center',marginTop:12,flexWrap:'wrap'}}>
        {['photos','videos','documents'].map(t=> (
          <label key={t} style={{display:'inline-flex',gap:6,alignItems:'center'}}>
            <input type="checkbox" checked={(cfg.types||[]).includes(t)} onChange={e=>{const s=new Set(cfg.types||[]); if(e.target.checked)s.add(t); else s.delete(t); setField('types',Array.from(s));}}/>
            <span>{t}</span>
          </label>
        ))}
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}>
          <input type="checkbox" checked={!!cfg.dry_run} onChange={e=>setField('dry_run',e.target.checked)}/>
          <span>Dry-run</span>
        </label>
        <div style={{marginLeft:'auto'}}><MinimalButton icon={saveIcon} onClick={save}>Kaydet</MinimalButton></div>
      </div>
    </Panel>
  );
}
