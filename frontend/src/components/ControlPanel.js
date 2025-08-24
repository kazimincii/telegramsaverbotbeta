import React, { useContext, useEffect } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
  const { error, setField } = useContext(AppContext);

  useEffect(() => {
    fetchDialogs().then(r => {
      if (r.ok && Array.isArray(r.data)) {
        setField('chats', r.data.map(d => d.name));
      }
    });
  }, [setField]);
  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:'0 16px'}}>
      <h1 style={{fontSize:22,margin:0,marginBottom:12}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      {error && (
        <div style={{background:'#f8d7da',border:'1px solid #f5c2c7',borderRadius:10,padding:10,marginBottom:12}}>
          {error}
        </div>
      )}
      <SettingsForm />
      <StatusPanel />
      <LogViewer />
    </div>
  );
}

