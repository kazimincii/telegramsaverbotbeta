import React, { useContext, useEffect, useState } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
codex/add-kisiler-sekmesi
import ContactsPanel from './ContactsPanel';

import FaqSection from './FaqSection';
main
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
  const { error, setDialogs } = useContext(AppContext);
codex/add-kisiler-sekmesi
  const [tab, setTab] = useState('settings');

  const [tab, setTab] = useState('panel');
main

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
codex/add-kisiler-sekmesi
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

      {tab === 'panel' ? (
        <>
          <SettingsForm />
          <StatusPanel />
          <LogViewer />
        </>
      ) : (
        <FaqSection />
      )}
main
    </div>
  );
}

