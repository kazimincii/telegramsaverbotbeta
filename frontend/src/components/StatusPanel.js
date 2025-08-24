import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function StatusPanel(){
  const { running, progress, start, stop, cfg } = useContext(AppContext);
  const valid = cfg.api_id && cfg.api_hash && cfg.out;
  return (
    <div style={{marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span style={{padding:'6px 10px',borderRadius:999,fontSize:12,background:running?'#e9f7ee':'#e9ecef'}}>
          <span style={{display:'inline-block',width:8,height:8,borderRadius:999,background:running?'#2ecc71':'#6c757d',marginRight:6}}/>
          {running?"Çalışıyor":"Beklemede"}
        </span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={stop}>Durdur</button>
          <button onClick={()=>start(false)} disabled={!valid}>Başlat</button>
          <button onClick={()=>start(true)}>Dry-Run</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',columnGap:8,rowGap:6,fontSize:14}}>
        <div>Çalışma:</div><div>{running?"Evet":"Hayır"}</div>
        <div>Sohbet:</div><div>{progress?.chat||"-"}</div>
        <div>İndirilen:</div><div>{progress?.downloaded??0}</div>
        <div>Atlanan:</div><div>{progress?.skipped??0}</div>
      </div>
    </div>
  );
}
