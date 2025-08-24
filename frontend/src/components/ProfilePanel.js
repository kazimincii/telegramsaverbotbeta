import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Panel from './Panel';
import MinimalButton from './MinimalButton';
import saveIcon from '../assets/save.svg';

export default function ProfilePanel() {
  const { cfg, setField, save } = useContext(AppContext);
  return (
    <Panel>
      <div style={{display:'grid',gap:12,gridTemplateColumns:'1fr 1fr'}}>
        <div>
          <label style={{fontSize:12,color:'#555'}}>API ID</label>
          <input value={cfg.api_id} onChange={e=>setField('api_id',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/>
        </div>
        <div>
          <label style={{fontSize:12,color:'#555'}}>API HASH</label>
          <input value={cfg.api_hash} onChange={e=>setField('api_hash',e.target.value)} style={{width:'100%',padding:8,border:'1px solid #d0d0d0',borderRadius:10}}/>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
        <MinimalButton icon={saveIcon} onClick={save}>Kaydet</MinimalButton>
      </div>
    </Panel>
  );
}
