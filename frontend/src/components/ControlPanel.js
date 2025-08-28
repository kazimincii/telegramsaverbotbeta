import React, { useContext, useEffect, useState } from 'react';
import SettingsForm from './SettingsForm';
import StatusPanel from './StatusPanel';
import LogViewer from './LogViewer';
import ErrorViewer from './ErrorViewer';
import ContactsPanel from './ContactsPanel';
import FaqSection from './FaqSection';
import MinimalButton from './MinimalButton';
import ProfilePanel from './ProfilePanel';
import GroupsPanel from './GroupsPanel';
import panelIcon from '../assets/panel.svg';
import faqIcon from '../assets/faq.svg';
import settingsIcon from '../assets/settings.svg';
import statusIcon from '../assets/status.svg';
import logIcon from '../assets/log.svg';
import errorIcon from '../assets/error.svg';
import contactsIcon from '../assets/contacts.svg';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

export default function ControlPanel(){
  const { setDialogs } = useContext(AppContext);
  const [mainTab, setMainTab] = useState('panel');
  const [subTab, setSubTab] = useState('profile');

  useEffect(() => {
    fetchDialogs()
      .then(d => {
        if (Array.isArray(d)) {
          setDialogs(d);
        }
      })
      .catch(err => console.error(err));
  }, [setDialogs]);

  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:'0 16px'}}>
      <h1 style={{fontSize:22,margin:0,marginBottom:12}}>Telegram Arşivleyici — Kontrol Paneli</h1>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <MinimalButton icon={panelIcon} onClick={()=>setMainTab('panel')}>Kontrol Paneli</MinimalButton>
        <MinimalButton icon={faqIcon} onClick={()=>setMainTab('faq')}>SSS</MinimalButton>
      </div>
      {mainTab === 'panel' ? (
        <>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <MinimalButton icon={panelIcon} onClick={()=>setSubTab('profile')}>Profil</MinimalButton>
            <MinimalButton icon={contactsIcon} onClick={()=>setSubTab('groups')}>Gruplar</MinimalButton>
            <MinimalButton icon={settingsIcon} onClick={()=>setSubTab('settings')}>Ayarlar</MinimalButton>
            <MinimalButton icon={statusIcon} onClick={()=>setSubTab('status')}>Durum</MinimalButton>
            <MinimalButton icon={logIcon} onClick={()=>setSubTab('log')}>Loglar</MinimalButton>
            <MinimalButton icon={errorIcon} onClick={()=>setSubTab('errors')}>Hatalar</MinimalButton>
            <MinimalButton icon={contactsIcon} onClick={()=>setSubTab('contacts')}>Kişiler</MinimalButton>
          </div>
          {subTab === 'profile' && <ProfilePanel />}
          {subTab === 'groups' && <GroupsPanel />}
          {subTab === 'settings' && <SettingsForm />}
          {subTab === 'status' && <StatusPanel />}
          {subTab === 'log' && <LogViewer />}
          {subTab === 'errors' && <ErrorViewer />}
          {subTab === 'contacts' && <ContactsPanel />}
        </>
      ) : (
        <FaqSection />
      )}
    </div>
  );
}
