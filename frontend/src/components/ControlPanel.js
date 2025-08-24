import React, { useContext } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import { AppContext } from '../context/AppContext';

export default function ControlPanel(){
  const { error } = useContext(AppContext);
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

