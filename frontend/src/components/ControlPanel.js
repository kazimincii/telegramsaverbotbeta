import React from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';

export default function ControlPanel(){
  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:'0 16px'}}>
      <h1 style={{fontSize:22,marginBottom:12}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      <SettingsForm />
      <StatusPanel />
      <LogViewer />
    </div>
  );
}
