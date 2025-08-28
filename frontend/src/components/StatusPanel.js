import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Panel from './Panel';
import MinimalButton from './MinimalButton';
import playIcon from '../assets/play.svg';
import stopIcon from '../assets/stop.svg';
import testIcon from '../assets/test.svg';

export default function StatusPanel(){
  const { running, progress, start, stop, cfg } = useContext(AppContext);
  const valid = cfg.api_id && cfg.api_hash && cfg.out;
  return (
    <Panel style={{marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span style={{padding:'6px 10px',borderRadius:999,fontSize:12,background:running?'#e9f7ee':'#e9ecef'}}>
          <span style={{display:'inline-block',width:8,height:8,borderRadius:999,background:running?'#2ecc71':'#6c757d',marginRight:6}}/>
          {running?"Çalışıyor":"Beklemede"}
        </span>
        <div style={{display:'flex',gap:8}}>
          <MinimalButton icon={stopIcon} onClick={async ()=>{ try{ await stop(); } catch(e){} }}>Durdur</MinimalButton>
          <MinimalButton icon={playIcon} onClick={async ()=>{ try{ await start(false); } catch(e){} }} disabled={!valid}>Başlat</MinimalButton>
          <MinimalButton icon={testIcon} onClick={async ()=>{ try{ await start(true); } catch(e){} }}>Dry-Run</MinimalButton>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',columnGap:8,rowGap:6,fontSize:14}}>
        <div>Çalışma:</div><div>{running?"Evet":"Hayır"}</div>
        <div>Sohbet:</div><div>{progress?.chat||"-"}</div>
        <div>İndirilen:</div><div>{progress?.downloaded??0}</div>
        <div>Atlanan:</div><div>{progress?.skipped??0}</div>
      </div>
    </Panel>
  );
}
