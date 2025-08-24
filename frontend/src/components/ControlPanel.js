import React, { useContext, useEffect, useState } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import ContactsPanel from './ContactsPanel';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
  const { error, setDialogs } = useContext(AppContext);
  const [tab, setTab] = useState('settings');

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
      {error && (
        <div style={{background:'#f8d7da',border:'1px solid #f5c2c7',borderRadius:10,padding:10,marginBottom:12}}>
          {error}
        </div>
      )}
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <button onClick={()=>setTab('settings')}>Ayarlar</button>
        <button onClick={()=>setTab('status')}>Durum</button>
        <button onClick={()=>setTab('log')}>Loglar</button>
        <button onClick={()=>setTab('contacts')}>Kişiler</button>
      </div>
      {tab === 'settings' && <SettingsForm />}
      {tab === 'status' && <StatusPanel />}
      {tab === 'log' && <LogViewer />}
      {tab === 'contacts' && <ContactsPanel />}
    </div>
  );
}

