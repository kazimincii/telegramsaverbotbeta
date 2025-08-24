import React, { useContext, useEffect, useState } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import FaqSection from './FaqSection';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
  const { error, setDialogs } = useContext(AppContext);
  const [tab, setTab] = useState('panel');

  useEffect(() => {
    fetchDialogs().then(r => {
      if (r.ok && Array.isArray(r.data)) {
        setDialogs(r.data);
      }
    });
  }, [setDialogs]);
  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:'0 16px'}}>
      <h1 style={{fontSize:22,margin:0,marginBottom:12}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <button onClick={()=>setTab('panel')}>Kontrol Paneli</button>
        <button onClick={()=>setTab('faq')}>SSS</button>
      </div>
      {error && (
        <div style={{background:'#f8d7da',border:'1px solid #f5c2c7',borderRadius:10,padding:10,marginBottom:12}}>
          {error}
        </div>
      )}
      {tab === 'panel' ? (
        <>
          <SettingsForm />
          <StatusPanel />
          <LogViewer />
        </>
      ) : (
        <FaqSection />
      )}
    </div>
  );
}

