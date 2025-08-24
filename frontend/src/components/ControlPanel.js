import React, { useContext, useEffect, useState } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
codex/add-group-selection-list-feature-047pqy
  const { error, setDialogs } = useContext(AppContext);

codex/add-group-selection-list-feature-z3rqdr
  const { error, setDialogs } = useContext(AppContext);

  const { error } = useContext(AppContext);
  const [dialogs, setDialogs] = useState([]);
main
main

  useEffect(() => {
    fetchDialogs().then(r => {
      if (r.ok && Array.isArray(r.data)) {
        setDialogs(r.data);
      }
    });
codex/add-group-selection-list-feature-047pqy
  }, [setDialogs]);

codex/add-group-selection-list-feature-z3rqdr
  }, [setDialogs]);

  }, []);
main
main
  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:'0 16px'}}>
      <h1 style={{fontSize:22,margin:0,marginBottom:12}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      {error && (
        <div style={{background:'#f8d7da',border:'1px solid #f5c2c7',borderRadius:10,padding:10,marginBottom:12}}>
          {error}
        </div>
      )}
      <SettingsForm dialogs={dialogs} />
      <StatusPanel />
      <LogViewer />
    </div>
  );
}

